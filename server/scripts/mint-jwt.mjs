#!/usr/bin/env node
/**
 * Mint a JWT identical in shape to what /v1/auth/login produces.
 *
 * Used when:
 *   - The founder account is Google-OAuth-only (no password to log in with).
 *   - You want a long-lived token for scripted ops without going through
 *     the login flow on every run.
 *
 * Reads from .env (DATABASE_URL + JWT_SECRET + JWT_EXPIRY).
 * Looks up the user + their first OWNER/ADMIN/MEMBER membership.
 * Prints the JWT to stdout (so it can be `eval $(... )`-piped) and a
 * summary to stderr.
 *
 * Usage (from server/ directory):
 *   node --env-file=.env scripts/mint-jwt.mjs founder@rekaman.io
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const email = process.argv[2];
if (!email) {
  console.error('usage: node --env-file=server/.env scripts/mint-jwt.mjs <email>');
  process.exit(2);
}
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET not loaded — check --env-file=server/.env path');
  process.exit(2);
}

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    isSuperAdmin: true,
    deletedAt: true,
    memberships: {
      select: {
        brandId: true,
        role: true,
        brand: { select: { id: true, slug: true, companyName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    },
  },
});

if (!user) {
  console.error(`no user with email=${email}`);
  await prisma.$disconnect();
  process.exit(1);
}
if (user.deletedAt) {
  console.error(`user ${email} is soft-deleted`);
  await prisma.$disconnect();
  process.exit(1);
}
if (user.memberships.length === 0) {
  console.error(`user ${email} has no brand memberships — nothing to scope a JWT to`);
  await prisma.$disconnect();
  process.exit(1);
}

const m = user.memberships[0];

const token = jwt.sign(
  {
    userId: user.id,
    brandId: m.brandId,
    email: user.email,
    role: m.role,
    isSuperAdmin: user.isSuperAdmin,
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRY ?? '7d' },
);

console.error('✅ minted JWT');
console.error('   user.id    =', user.id);
console.error('   brand.id   =', m.brandId);
console.error('   brand.slug =', m.brand.slug);
console.error('   brand.name =', m.brand.companyName);
console.error('   role       =', m.role);
if (user.memberships.length > 1) {
  console.error(`   note: user is in ${user.memberships.length} brands; using the first (${m.brand.slug})`);
}
console.error('');

// stdout = just the token, so it's eval-pipe friendly
console.log(token);

await prisma.$disconnect();
