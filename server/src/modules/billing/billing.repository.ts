import { prisma } from '../../shared/db.js';
import type { Prisma, SubscriptionStatus, InvoiceStatus } from '@prisma/client';

/*
 * Billing reads/writes. Plans are global; subscriptions + invoices are
 * brand-scoped. The Razorpay webhook reconciles by razorpaySubId, so we also
 * expose lookups by that key.
 */
export const billingRepository = {
  listPublicPlans: () =>
    prisma.pricingPlan.findMany({
      where: { isPublic: true, deprecatedAt: null },
      orderBy: { amountInPaise: 'asc' },
    }),

  findPlanById: (id: string) => prisma.pricingPlan.findUnique({ where: { id } }),

  getSubscription: (brandId: string) =>
    prisma.subscription.findUnique({ where: { brandId }, include: { pricingPlan: true } }),

  findSubscriptionByRazorpayId: (razorpaySubId: string) =>
    prisma.subscription.findUnique({ where: { razorpaySubId } }),

  upsertSubscription: (
    brandId: string,
    create: Prisma.SubscriptionUncheckedCreateInput,
    update: Prisma.SubscriptionUncheckedUpdateInput,
  ) =>
    prisma.subscription.upsert({
      where: { brandId },
      create,
      update,
    }),

  updateSubscriptionByRazorpayId: (
    razorpaySubId: string,
    data: Prisma.SubscriptionUncheckedUpdateInput,
  ) => prisma.subscription.update({ where: { razorpaySubId }, data }),

  listInvoices: (brandId: string) =>
    prisma.invoice.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),

  upsertInvoiceByRazorpayId: (
    razorpayInvoiceId: string,
    create: Prisma.InvoiceUncheckedCreateInput,
  ) =>
    prisma.invoice.upsert({
      where: { razorpayInvoiceId },
      create,
      update: {}, // idempotent — a replayed charge webhook must not duplicate the invoice
    }),

  countProducts: (brandId: string) =>
    prisma.product.count({ where: { brandId, deletedAt: null } }),
};

export type { SubscriptionStatus, InvoiceStatus };
