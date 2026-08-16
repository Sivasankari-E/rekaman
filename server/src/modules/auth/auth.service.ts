import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { authRepository } from './auth.repository.js';
import { getEnv } from '../../shared/env.js';
import { logger } from '../../shared/logger.js';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors.js';
import type {
  SignupInput,
  LoginInput,
  AuthResponse,
} from './auth.types.js';
import type { AuthContext } from '../../middleware/auth.js';

const BCRYPT_ROUNDS = 12;

function signToken(payload: AuthContext): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY,
  } as jwt.SignOptions);
}

function buildAuthResponse(
  user: { id: string; email: string; name: string | null; isSuperAdmin: boolean },
  brand: { id: string; slug: string; companyName: string },
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
): AuthResponse {
  const token = signToken({
    userId: user.id,
    brandId: brand.id,
    email: user.email,
    role,
    isSuperAdmin: user.isSuperAdmin,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
    },
    brand: {
      id: brand.id,
      slug: brand.slug,
      companyName: brand.companyName,
    },
    membership: { role },
  };
}

export const authService = {
  async signup(input: SignupInput): Promise<AuthResponse> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const { user, brand } = await authRepository.createUserWithBrand({
      email: input.email,
      passwordHash,
      name: input.name,
      companyName: input.companyName,
      emailVerified: false,
    });

    logger.info({ userId: user.id, brandId: brand.id }, 'user signed up via email');

    return buildAuthResponse(user, brand, 'OWNER');
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      // Don't disclose whether the email exists (timing attack mitigation)
      throw new InvalidCredentialsError();
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const ownerMembership = user.memberships.find((m) => m.role === 'OWNER');
    if (!ownerMembership) {
      throw new ValidationError('User has no active brand membership');
    }

    await authRepository.updateLastLogin(user.id);

    logger.info({ userId: user.id, brandId: ownerMembership.brandId }, 'user logged in');

    return buildAuthResponse(user, ownerMembership.brand, ownerMembership.role);
  },

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const env = getEnv();
    if (!env.GOOGLE_CLIENT_ID) {
      throw new ValidationError('Google OAuth not configured on server');
    }

    const oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      // Malformed / expired / wrong-audience tokens — client error, not 500.
      // Logged at warn (not error → Sentry) since this is the expected
      // failure mode for an internet-facing endpoint.
      logger.warn({ err }, 'google id token verification failed');
      throw new ValidationError('Invalid Google ID token');
    }

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new ValidationError('Invalid Google token payload');
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name;

    // 1. Try Google ID first
    let user = await authRepository.findUserByGoogleId(googleId);

    // 2. Try email — link Google to existing account
    if (!user) {
      const existing = await authRepository.findUserByEmail(email);
      if (existing) {
        await authRepository.linkGoogleAccount(existing.id, googleId);
        user = existing;
      }
    }

    // 3. First-time Google sign-in: create User + Brand + Membership
    if (!user) {
      const { user: newUser, brand } = await authRepository.createUserWithBrand({
        email,
        googleId,
        name: name ?? undefined,
        companyName: name ?? email.split('@')[0]!,
        emailVerified: true,
      });

      logger.info(
        { userId: newUser.id, brandId: brand.id },
        'user signed up via Google'
      );

      return buildAuthResponse(newUser, brand, 'OWNER');
    }

    const ownerMembership = user.memberships.find((m) => m.role === 'OWNER');
    if (!ownerMembership) {
      throw new ValidationError('User has no active brand membership');
    }

    await authRepository.updateLastLogin(user.id);

    logger.info({ userId: user.id }, 'user logged in via Google');

    return buildAuthResponse(user, ownerMembership.brand, ownerMembership.role);
  },

  async getMe(userId: string): Promise<{
    user: { id: string; email: string; name: string | null; isSuperAdmin: boolean };
    memberships: Array<{
      brandId: string;
      brandSlug: string;
      brandName: string;
      role: 'OWNER' | 'ADMIN' | 'MEMBER';
    }>;
  }> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new InvalidCredentialsError();

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
      },
      memberships: user.memberships.map((m) => ({
        brandId: m.brandId,
        brandSlug: m.brand.slug,
        brandName: m.brand.companyName,
        role: m.role,
      })),
    };
  },

  /**
   * Switch the active brand — issues a fresh JWT scoped to `targetBrandId`.
   * The user must be a member of that brand (else ForbiddenError). The route
   * sets the new cookie so subsequent requests are scoped to the new brand.
   */
  async switchBrand(userId: string, targetBrandId: string): Promise<AuthResponse> {
    const membership = await authRepository.findMembership(userId, targetBrandId);
    if (!membership) {
      throw new ForbiddenError('You are not a member of that brand');
    }
    const user = await authRepository.findUserById(userId);
    if (!user) throw new InvalidCredentialsError();

    return buildAuthResponse(
      { id: user.id, email: user.email, name: user.name, isSuperAdmin: user.isSuperAdmin },
      membership.brand,
      membership.role,
    );
  },
};
