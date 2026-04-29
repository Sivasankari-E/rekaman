import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../shared/logger.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      log: typeof logger;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId =
    (req.headers['x-request-id'] as string | undefined) ??
    randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.path,
  });

  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    req.log.info(
      {
        statusCode: res.statusCode,
        durationMs,
      },
      'request completed'
    );
  });

  next();
}
