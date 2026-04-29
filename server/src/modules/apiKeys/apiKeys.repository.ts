import { prisma } from '../../shared/db.js';
import { logger } from '../../shared/logger.js';

export const apiKeysRepository = {
  list: (brandId: string) =>
    prisma.apiKey.findMany({
      where: { brandId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (brandId: string, id: string) =>
    prisma.apiKey.findFirst({
      where: { id, brandId },
    }),

  /**
   * Find an active key by hash. Used by the public AR endpoint.
   * Returns the key WITH brand for downstream use.
   */
  findActiveByHash: (keyHash: string) =>
    prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: { brand: true },
    }),

  create: (brandId: string, data: {
    keyHash: string;
    keyPrefix: string;
    name?: string | null;
    scopes: string[];
    expiresAt?: Date | null;
  }) =>
    prisma.apiKey.create({
      data: {
        brandId,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        name: data.name ?? null,
        scopes: data.scopes,
        expiresAt: data.expiresAt ?? null,
      },
    }),

  revoke: (brandId: string, id: string) =>
    prisma.apiKey.updateMany({
      where: { id, brandId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

  /**
   * Update lastUsedAt — fire-and-forget on the hot path of public AR requests.
   * Errors are swallowed (silent fail keeps the request fast); a debug log is
   * left behind so failures are diagnosable without polluting Sentry.
   */
  touchLastUsed: (id: string) =>
    prisma.apiKey
      .update({
        where: { id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: unknown) => {
        logger.debug({ err, apiKeyId: id }, 'touchLastUsed failed (non-critical)');
      }),
};
