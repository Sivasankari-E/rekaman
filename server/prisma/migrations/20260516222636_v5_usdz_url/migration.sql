-- AlterTable
-- v5.15 USDZ pipeline: add iOS AR Quick Look format URL + size, captured from
-- Meshy's model_urls.usdz alongside the existing GLB. Nullable so pre-pipeline
-- products (and Meshy soft-fails) leave it null; SDK falls back to glbUrl on
-- iOS when usdzUrl is null.
ALTER TABLE "Product" ADD COLUMN     "usdzUrl" TEXT,
ADD COLUMN     "usdzSizeKb" INTEGER;
