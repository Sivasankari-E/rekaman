export interface CreateApiKeyInput {
  name?: string;
  scopes?: string[];
  expiresAt?: Date;
}

// Returned ONLY when creating — full key shown once
export interface CreatedApiKey {
  id: string;
  key: string;          // FULL key, never persisted in plaintext
  prefix: string;       // safe to display ("rk_live_abc...")
  name: string | null;
  scopes: string[];
  createdAt: Date;
}

// Returned on list/get — never includes full key
export interface ApiKeyListItem {
  id: string;
  prefix: string;
  name: string | null;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}
