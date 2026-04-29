import { beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from '../shared/db.js';

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error('DATABASE_URL is not set. Create .env.test from .env.test.example.');
  }

  // Permit only:
  //   - local databases (Docker / direct install)
  //   - explicit opt-in via RUN_DESTRUCTIVE_TESTS=true (for cloud test branches)
  const isLocal = /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/)/.test(url);
  const optedIn = process.env.RUN_DESTRUCTIVE_TESTS === 'true';

  if (!isLocal && !optedIn) {
    let host = '<unparseable>';
    try {
      host = new URL(url).host;
    } catch {
      /* ignore */
    }
    throw new Error(
      `REFUSING to run destructive tests against a non-local DATABASE_URL (host: ${host}). ` +
        'Tests run deleteMany() on every brand/product/membership/etc. row. ' +
        'If this database is intentionally a test target (e.g. a Neon test branch), ' +
        'set RUN_DESTRUCTIVE_TESTS=true in .env.test.'
    );
  }

  // Verify we can actually connect — fail fast with a clear message.
  await prisma.$queryRaw`SELECT 1`;
});

afterEach(async () => {
  // Clean up test data in FK-safe order (children first, then parents).
  await prisma.aREvent.deleteMany();
  await prisma.aRSession.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.product.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.orgInvitation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});
