-- AlterTable
ALTER TABLE "ARSession" ADD COLUMN     "arMode" TEXT NOT NULL DEFAULT 'placement',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE INDEX "ARSession_brandId_arMode_idx" ON "ARSession"("brandId", "arMode");

-- CreateIndex
CREATE INDEX "Product_brandId_arMode_idx" ON "Product"("brandId", "arMode");
