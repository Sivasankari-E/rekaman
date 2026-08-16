import { createHash, randomBytes } from 'crypto';

/**
 * Generate a fresh API key, return both the displayable key and its hash.
 * Show the key once to the user; only store the hash in DB.
 */
export function generateApiKey(prefix: 'live' | 'test' = 'live'): {
  key: string;
  hash: string;
  displayPrefix: string;
} {
  const random = randomBytes(24).toString('base64url');
  const key = `rk_${prefix}_${random}`;
  return {
    key,
    hash: hashApiKey(key),
    displayPrefix: key.slice(0, 12),
  };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a cryptographically secure random token (for invitations, password resets).
 */
export function generateToken(length = 32): string {
  return randomBytes(length).toString('base64url');
}

/** SHA-256 hex of an opaque token (password-reset tokens are stored hashed). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
