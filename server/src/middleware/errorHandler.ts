import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { DomainError, ValidationError } from '../shared/errors.js';
import { Sentry } from '../shared/sentry.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId;

  // Zod validation errors → 400 with field details
  if (err instanceof ZodError) {
    const error = new ValidationError('Invalid request', {
      fields: err.flatten().fieldErrors,
    });
    return res.status(error.status).json({ ...error.toJSON(), requestId });
  }

  // Domain errors → status from class
  if (err instanceof DomainError) {
    if (err.status >= 500) {
      req.log?.error({ err, code: err.code }, 'domain error (5xx)');
      Sentry.captureException(err, { tags: { code: err.code, status: err.status } });
    } else {
      req.log?.warn({ code: err.code, status: err.status }, 'domain error');
    }
    return res.status(err.status).json({ ...err.toJSON(), requestId });
  }

  // Unknown errors → 500, log + Sentry
  const error = err instanceof Error ? err : new Error(String(err));
  req.log?.error({ err: error }, 'unhandled error');
  Sentry.captureException(error, { tags: { unhandled: 'true' } });

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
    requestId,
  });
}
