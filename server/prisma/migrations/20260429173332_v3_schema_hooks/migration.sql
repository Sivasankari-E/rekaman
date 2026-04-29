-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "arMode" TEXT NOT NULL DEFAULT 'placement',
ADD COLUMN     "category" TEXT;

-- CreateTable
CREATE TABLE "ProductAsset" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "url" TEXT,
    "metadata" JSONB,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "productId" TEXT,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "amountInPaise" INTEGER,
    "metadata" JSONB,
    "source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundWebhook" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundWebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAsset_productId_assetType_idx" ON "ProductAsset"("productId", "assetType");

-- CreateIndex
CREATE INDEX "ConversionEvent_brandId_timestamp_idx" ON "ConversionEvent"("brandId", "timestamp");

-- CreateIndex
CREATE INDEX "ConversionEvent_brandId_eventType_timestamp_idx" ON "ConversionEvent"("brandId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "ConversionEvent_sessionId_idx" ON "ConversionEvent"("sessionId");

-- CreateIndex
CREATE INDEX "OutboundWebhook_brandId_idx" ON "OutboundWebhook"("brandId");

-- CreateIndex
CREATE INDEX "OutboundWebhookDelivery_webhookId_createdAt_idx" ON "OutboundWebhookDelivery"("webhookId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundWebhook" ADD CONSTRAINT "OutboundWebhook_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundWebhookDelivery" ADD CONSTRAINT "OutboundWebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "OutboundWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
