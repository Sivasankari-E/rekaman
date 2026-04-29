import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default pricing plans...');

  await prisma.pricingPlan.upsert({
    where: { code: 'starter_monthly_inr' },
    update: {},
    create: {
      code: 'starter_monthly_inr',
      tier: 'STARTER',
      displayName: 'Starter (Monthly)',
      amountInPaise: 399900,
      currency: 'INR',
      billingPeriod: 'MONTHLY',
      sessionLimit: 500,
      productLimit: 10,
      features: ['basic_analytics', 'email_support'],
    },
  });

  await prisma.pricingPlan.upsert({
    where: { code: 'pro_monthly_inr' },
    update: {},
    create: {
      code: 'pro_monthly_inr',
      tier: 'PRO',
      displayName: 'Pro (Monthly)',
      amountInPaise: 1299900,
      currency: 'INR',
      billingPeriod: 'MONTHLY',
      sessionLimit: 5000,
      productLimit: 50,
      features: ['full_analytics', 'roi_calculator', 'shopify_app'],
    },
  });

  await prisma.pricingPlan.upsert({
    where: { code: 'enterprise_monthly_inr' },
    update: {},
    create: {
      code: 'enterprise_monthly_inr',
      tier: 'ENTERPRISE',
      displayName: 'Enterprise (Monthly)',
      amountInPaise: 4999900,
      currency: 'INR',
      billingPeriod: 'MONTHLY',
      sessionLimit: 999999,
      productLimit: 999999,
      features: ['white_label_sdk', 'dedicated_support', 'sla'],
    },
  });

  console.log('✔ Seeded pricing plans');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
