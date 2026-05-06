import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  where: { deletedAt: null },
  select: {
    email: true,
    googleId: true,
    passwordHash: true,
    isSuperAdmin: true,
    createdAt: true,
    memberships: {
      select: { role: true, brand: { select: { slug: true, companyName: true } } },
    },
  },
  orderBy: { createdAt: 'asc' },
});
for (const u of users) {
  const auth = [u.passwordHash ? 'password' : null, u.googleId ? 'google' : null]
    .filter(Boolean).join('+') || 'NONE';
  const brands = u.memberships.map((m) => `${m.brand.slug}(${m.role})`).join(', ');
  console.log(`${u.email.padEnd(40)} auth=${auth.padEnd(15)} super=${u.isSuperAdmin} brands=[${brands}]`);
}
await prisma.$disconnect();
