-- v5 brand theme — AR button styling columns on Brand.
-- Additive, all nullable, no index, no lock — prod-safe. The SDK falls back
-- to Rekaman defaults when these are null, so existing brands are unaffected.
ALTER TABLE "Brand" ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "textColor" TEXT,
ADD COLUMN     "buttonStyle" TEXT,
ADD COLUMN     "buttonLabel" TEXT;
