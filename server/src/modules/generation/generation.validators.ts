import { z } from 'zod';

/**
 * Photo URLs must be:
 *   - HTTPS (Meshy fetches them server-side; HTTP is rejected by their fetcher)
 *   - publicly reachable (Meshy can't bring its own auth)
 *
 * The HTTPS check is enforced both here (fast 400) and in the service layer
 * as defense-in-depth.
 */
const photoUrlSchema = z.string().url().startsWith('https://', 'Photo URLs must be HTTPS');

export const requestGenerationSchema = z.object({
  photoUrls: z.array(photoUrlSchema).min(1).max(4),
  config: z
    .object({
      aiModel: z.enum(['meshy-6', 'latest']).optional(),
      shouldRemesh: z.boolean().optional(),
      shouldTexture: z.boolean().optional(),
      enablePbr: z.boolean().optional(),
      targetPolycount: z.number().int().min(1000).max(300000).optional(),
      autoSize: z.boolean().optional(),
    })
    .optional(),
});

export type RequestGenerationInput = z.infer<typeof requestGenerationSchema>;

export const productIdParamSchema = z.object({
  productId: z.string().min(1).max(50),
});
