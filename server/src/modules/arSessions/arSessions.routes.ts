import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { apiKeysService } from '../apiKeys/apiKeys.service.js';
import { arSessionsService } from './arSessions.service.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { NotFoundError } from '../../shared/errors.js';

const router = Router();

const eventsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const EventSchema = z.object({
  sessionId: z.string().min(1).max(64),
  eventType: z.string().min(1).max(64),
  productSlug: z.string().max(100).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.number().int().positive().optional(),
  arMode: z.string().max(30).optional(),
  deviceType: z.string().max(20).optional(),
  language: z.string().max(10).optional(),
  userAgent: z.string().max(500).optional(),
  referrer: z.string().max(2048).optional(),
});

const BatchSchema = z.object({
  apiKey: z.string().regex(/^rk_(live|test)_[A-Za-z0-9_-]+$/),
  events: z.array(EventSchema).min(1).max(100),
});

// sendBeacon may post the JSON body as Content-Type: text/plain. Express's
// text() parser captures it as a string; we parse to JSON here so the route
// handler always sees a parsed object.
function parseTextBeacon(req: Request, _res: Response, next: NextFunction) {
  if (req.is('text/plain') && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // Falls through; Zod validation below produces a clean 400.
    }
  }
  next();
}

router.post(
  '/',
  eventsRateLimit,
  parseTextBeacon,
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey, events } = BatchSchema.parse(req.body);

    const auth = await apiKeysService.verifyKey(apiKey);
    if (!auth) throw new NotFoundError('Brand');

    const result = await arSessionsService.ingestBatch(auth.brandId, events);
    res.json(result);
  }),
);

export const arSessionsRoutes: Router = router;
