import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { authRepository } from './auth.repository.js';
import { getEnv } from '../../shared/env.js';
import { logger } from '../../shared/logger.js';
import { generateToken, hashToken } from '../../shared/crypto.js';
import { sendEmail } from '../../shared/clients/resend.client.js';
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
   * Start a password reset. ALWAYS resolves the same way whether or not the
   * email exists — never leak account existence. When the user exists we store
   * a hashed, 1-hour, single-use token and email the raw token in a link.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      logger.info({ email }, 'password reset requested for unknown email (no-op)');
      return;
    }
    const raw = generateToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await authRepository.createPasswordResetToken(user.id, hashToken(raw), expiresAt);

    const env = getEnv();
    const link = `${env.DASHBOARD_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(raw)}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your Rekaman password',
      html: `
        <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px">
          <h2 style="color:#111827">Reset your password</h2>
          <p style="color:#475569;line-height:1.6">
            We received a request to reset your Rekaman password. This link expires in 1 hour.
          </p>
          <p style="margin:24px 0">
            <a href="${link}" style="background:#3b82f6;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;display:inline-block">Reset password</a>
          </p>
          <p style="color:#94a3b8;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
    });
    logger.info({ userId: user.id }, 'password reset email dispatched');
  },

  /** Complete a password reset with a valid, unexpired, unused token. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await authRepository.findPasswordResetToken(hashToken(token));
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new ValidationError('This reset link is invalid or has expired');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await authRepository.resetPassword(record.userId, passwordHash);
    logger.info({ userId: record.userId }, 'password reset completed');
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
