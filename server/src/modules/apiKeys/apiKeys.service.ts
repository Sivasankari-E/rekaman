import { apiKeysRepository } from './apiKeys.repository.js';
import { generateApiKey, hashApiKey } from '../../shared/crypto.js';
import { NotFoundError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import type {
  CreateApiKeyInput,
  CreatedApiKey,
  ApiKeyListItem,
} from './apiKeys.types.js';

export const apiKeysService = {
  list: async (brandId: string): Promise<ApiKeyListItem[]> => {
    const keys = await apiKeysRepository.list(brandId);
    return keys.map((k) => ({
      id: k.id,
      prefix: k.keyPrefix,
      name: k.name,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      revokedAt: k.revokedAt,
      createdAt: k.createdAt,
    }));
  },

  /**
   * Generate and store a new API key.
   * Returns FULL key in the response — CALLER MUST display once and never again.
   * Only the SHA-256 hash is persisted.
   */
  create: async (
    brandId: string,
    input: CreateApiKeyInput,
  ): Promise<CreatedApiKey> => {
    const { key, hash, displayPrefix } = generateApiKey('live');

    const created = await apiKeysRepository.create(brandId, {
      keyHash: hash,
      keyPrefix: displayPrefix,
      name: input.name ?? null,
      scopes: input.scopes ?? [],
      expiresAt: input.expiresAt ?? null,
    });

    logger.info(
      { brandId, apiKeyId: created.id, prefix: displayPrefix },
      'api key created',
    );

    return {
      id: created.id,
      key,                              // ← full key, shown once
      prefix: created.keyPrefix,
      name: created.name,
      scopes: created.scopes,
      createdAt: created.createdAt,
    };
  },

  revoke: async (brandId: string, id: string): Promise<{ ok: true }> => {
    const result = await apiKeysRepository.revoke(brandId, id);
    if (result.count === 0) throw new NotFoundError('API Key');

    logger.info({ brandId, apiKeyId: id }, 'api key revoked');
    return { ok: true };
  },

  /**
   * Verify a raw key string against the DB.
   * Returns brand context if valid, null otherwise.
   * Used by the public AR endpoint and events endpoint.
   */
  verifyKey: async (rawKey: string) => {
    if (!rawKey.startsWith('rk_')) return null;

    const hash = hashApiKey(rawKey);
    const apiKey = await apiKeysRepository.findActiveByHash(hash);
    if (!apiKey) return null;

    void apiKeysRepository.touchLastUsed(apiKey.id);

    return {
      apiKeyId: apiKey.id,
      brandId: apiKey.brandId,
      brand: apiKey.brand,
      scopes: apiKey.scopes,
    };
  },
};
