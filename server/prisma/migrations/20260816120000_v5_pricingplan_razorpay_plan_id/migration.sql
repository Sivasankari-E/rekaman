-- Additive: map each PricingPlan to its Razorpay plan_id (nullable until the
-- setup script creates the plans in Razorpay and backfills these).
ALTER TABLE "PricingPlan" ADD COLUMN "razorpayPlanId" TEXT;
CREATE UNIQUE INDEX "PricingPlan_razorpayPlanId_key" ON "PricingPlan"("razorpayPlanId");
