import { prisma } from '../../shared/db.js';
import { generateBrandSlug } from '../../shared/slug.js';

export const authRepository = {
  /**
   * Find user by email (case-insensitive).
   * Returns user with all memberships and the brands they belong to.
   */
  findUserByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          include: { brand: true },
        },
      },
    }),

  findUserById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { brand: true },
        },
      },
    }),

  findUserByGoogleId: (googleId: string) =>
    prisma.user.findUnique({
      where: { googleId },
      include: {
        memberships: {
          include: { brand: true },
        },
      },
    }),

  /**
   * Atomically create User + Brand + Membership.
   * Used during signup (both email/password and Google first-time).
   */
  createUserWithBrand: async (data: {
    email: string;
    passwordHash?: string;
    googleId?: string;
    name?: string;
    companyName: string;
    emailVerified: boolean;
  }) => {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash: data.passwordHash ?? null,
          googleId: data.googleId ?? null,
          name: data.name ?? null,
          emailVerified: data.emailVerified,
        },
      });

      const brand = await tx.brand.create({
        data: {
          slug: generateBrandSlug(data.companyName),
          companyName: data.companyName,
          primaryEmail: data.email.toLowerCase().trim(),
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          brandId: brand.id,
          role: 'OWNER',
        },
      });

      return { user, brand };
    });
  },

  updateLastLogin: (userId: string) =>
    prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    }),

  linkGoogleAccount: (userId: string, googleId: string) =>
    prisma.user.update({
      where: { id: userId },
      data: { googleId, emailVerified: true },
    }),

  findMembership: (userId: string, brandId: string) =>
    prisma.membership.findUnique({
      where: { userId_brandId: { userId, brandId } },
      include: { brand: true },
    }),

  // ── Password reset ──

  createPasswordResetToken: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),

  findPasswordResetToken: (tokenHash: string) =>
    prisma.passwordResetToken.findUnique({ where: { tokenHash } }),

  /** Set a new password AND consume every outstanding reset token for the user. */
  resetPassword: (userId: string, passwordHash: string) =>
    prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]),
};
