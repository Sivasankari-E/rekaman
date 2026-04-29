/**
 * Base class for all domain errors.
 * Each subclass declares a stable `code` (string literal) and HTTP `status`.
 * The error handler middleware converts these to consistent HTTP responses.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ── 400 Bad Request ──

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR' as const;
  readonly status = 400;
}

// ── 401 Unauthorized ──

export class AuthenticationRequiredError extends DomainError {
  readonly code = 'AUTHENTICATION_REQUIRED' as const;
  readonly status = 401;

  constructor() {
    super('Authentication required');
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS' as const;
  readonly status = 401;

  constructor() {
    super('Invalid email or password');
  }
}

export class InvalidTokenError extends DomainError {
  readonly code = 'INVALID_TOKEN' as const;
  readonly status = 401;

  constructor() {
    super('Invalid or expired token');
  }
}

// ── 403 Forbidden ──

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN' as const;
  readonly status = 403;
}

export class InsufficientRoleError extends DomainError {
  readonly code = 'INSUFFICIENT_ROLE' as const;
  readonly status = 403;
}

// ── 404 Not Found ──

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND' as const;
  readonly status = 404;

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

// ── 409 Conflict ──

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT' as const;
  readonly status = 409;
}

export class EmailAlreadyExistsError extends DomainError {
  readonly code = 'EMAIL_EXISTS' as const;
  readonly status = 409;

  constructor() {
    super('An account with this email already exists');
  }
}

export class SlugAlreadyExistsError extends DomainError {
  readonly code = 'SLUG_EXISTS' as const;
  readonly status = 409;

  constructor() {
    super('A resource with this slug already exists');
  }
}

// ── 429 Rate Limit ──

export class RateLimitExceededError extends DomainError {
  readonly code = 'RATE_LIMIT_EXCEEDED' as const;
  readonly status = 429;

  constructor() {
    super('Too many requests, please try again later');
  }
}
