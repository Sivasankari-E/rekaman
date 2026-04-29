import { Prisma } from '@prisma/client';
import { arSessionsRepository } from './arSessions.repository.js';
import { productsService } from '../products/products.service.js';
import { logger } from '../../shared/logger.js';

interface IngestEventInput {
  sessionId: string;
  eventType: string;
  productSlug?: string;
  payload?: Record<string, unknown>;
  timestamp?: number;       // ms since epoch from SDK
  arMode?: string;
  deviceType?: string;
  language?: string;
  userAgent?: string;
  referrer?: string;
}

export const arSessionsService = {
  ingestBatch: async (
    brandId: string,
    events: IngestEventInput[],
  ): Promise<{ accepted: number }> => {
    if (events.length === 0) return { accepted: 0 };

    // Group by sessionId so we upsert each session once
    const sessionMap = new Map<string, IngestEventInput>();
    for (const event of events) {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, event);
      }
    }

    // Resolve product slugs to IDs via the products module (no cross-module DB access)
    const slugSet = new Set(
      events.map((e) => e.productSlug).filter((s): s is string => !!s),
    );
    const productMap = await productsService.findIdMapBySlug(
      brandId,
      Array.from(slugSet),
    );

    // Upsert sessions (one round-trip per unique session in the batch)
    for (const [sessionId, sample] of sessionMap.entries()) {
      const productId = sample.productSlug
        ? productMap.get(sample.productSlug) ?? null
        : null;

      await arSessionsRepository.upsertSession({
        sessionId,
        brandId,
        productId,
        arMode: sample.arMode ?? 'placement',
        deviceType: sample.deviceType ?? 'unknown',
        language: sample.language ?? 'en',
        userAgent: sample.userAgent,
        referrer: sample.referrer,
      });
    }

    // Insert events
    const eventRows: Prisma.AREventCreateManyInput[] = events.map((e) => ({
      sessionId: e.sessionId,
      brandId,
      productId: e.productSlug ? productMap.get(e.productSlug) ?? null : null,
      eventType: e.eventType,
      // Prisma treats `undefined` as "skip this field"; for explicit JSON null we use Prisma.JsonNull.
      payload:
        e.payload === undefined
          ? Prisma.JsonNull
          : (e.payload as Prisma.InputJsonValue),
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));

    const result = await arSessionsRepository.appendEvents(eventRows);

    // Update session aggregates based on event types
    for (const event of events) {
      if (event.eventType === 'ar_placed') {
        await arSessionsRepository.updateSessionAggregates(event.sessionId, {
          didPlace: true,
        });
      } else if (event.eventType === 'add_to_cart') {
        await arSessionsRepository.updateSessionAggregates(event.sessionId, {
          didAddToCart: true,
        });
      } else if (
        event.eventType === 'ar_session_ended' &&
        typeof event.payload?.durationMs === 'number'
      ) {
        await arSessionsRepository.updateSessionAggregates(event.sessionId, {
          endedAt: new Date(),
          durationMs: event.payload.durationMs as number,
        });
      }
    }

    logger.debug({ brandId, count: result.count }, 'events ingested');

    return { accepted: result.count };
  },
};
