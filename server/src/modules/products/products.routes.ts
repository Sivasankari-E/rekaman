import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ValidationError } from '../../shared/errors.js';

const router = Router();

router.use(requireAuth);

// ── Product photo upload (multipart) ──
// In-memory (buffer) upload; the service streams it to S3. 12 MB cap, images
// only. Wrapped so multer's own errors surface as our typed ValidationError.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in ALLOWED_IMAGE_TYPES),
});
function uploadSingle(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(
        new ValidationError(
          err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 12 MB).' : 'Upload failed.',
        ),
      );
      return;
    }
    if (err) {
      next(err as Error);
      return;
    }
    next();
  });
}

const SlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and dashes');

// `arMode` mirrors Product.arMode in the Prisma schema. Server-side default is
// 'placement' so omitting it is safe — see `category` too which is nullable.
// Added in Week 6 Day 2 so server/scripts/onboard-brand.mjs can persist the
// brand-provided arMode + category instead of having Zod silently strip them.
const ArModeSchema = z.enum([
  'placement',
  'tryon-face',
  'tryon-wrist',
  'tryon-hand',
  'tryon-foot',
  'tryon-photo',
  'multi-scene',
  'audio-preview',
]);

// Loose category — we don't want a closed enum here because brands invent
// their own taxonomies (e.g. "home-decor", "wedding-jewelry"). 64 chars is
// generous for slug-style + readable names.
const CategorySchema = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/i, 'category must be alphanumeric/dashes');

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: SlugSchema,
  arMode: ArModeSchema.optional(),
  category: CategorySchema.nullable().optional(),
  widthCm: z.number().positive().max(10_000).optional(),
  heightCm: z.number().positive().max(10_000).optional(),
  depthCm: z.number().positive().max(10_000).optional(),
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: SlugSchema.optional(),
  arMode: ArModeSchema.optional(),
  category: CategorySchema.nullable().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED']).optional(),
  widthCm: z.number().positive().max(10_000).optional(),
  heightCm: z.number().positive().max(10_000).optional(),
  depthCm: z.number().positive().max(10_000).optional(),
});

const IdParam = z.object({ id: z.string().min(1).max(50) });

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const products = await productsService.list(req.brandId!);
    res.json({ products });
  })
);

router.post(
  '/',
  requireRole('OWNER', 'ADMIN', 'MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateSchema.parse(req.body);
    const product = await productsService.create(req.brandId!, input);
    res.status(201).json({ product });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    const product = await productsService.get(req.brandId!, id);
    res.json({ product });
  })
);

router.patch(
  '/:id',
  requireRole('OWNER', 'ADMIN', 'MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    const input = UpdateSchema.parse(req.body);
    const product = await productsService.update(req.brandId!, id, input);
    res.json({ product });
  })
);

router.delete(
  '/:id',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    await productsService.delete(req.brandId!, id);
    res.status(204).end();
  })
);

// POST /v1/products/:id/photos — upload one product image (multipart field
// "file"). Returns { url } (public S3 URL) to feed into generation.
router.post(
  '/:id/photos',
  requireRole('OWNER', 'ADMIN', 'MEMBER'),
  uploadSingle,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    const file = req.file;
    if (!file) {
      throw new ValidationError('Please upload a JPEG, PNG, or WebP image under 12 MB.');
    }
    const ext = ALLOWED_IMAGE_TYPES[file.mimetype]!;
    const result = await productsService.uploadPhoto(
      req.brandId!,
      id,
      file.buffer,
      ext,
      file.mimetype,
    );
    res.status(201).json(result);
  })
);

export const productsRoutes: Router = router;
