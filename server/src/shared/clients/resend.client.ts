import { getEnv } from '../env.js';
import { logger } from '../logger.js';

/*
 * Minimal Resend email sender (fetch-based, no SDK). Transactional only.
 *
 * Failure policy: email sending NEVER throws — callers (e.g. forgot-password)
 * must not 500 or leak account existence when email is misconfigured or Resend
 * is down. When RESEND_API_KEY is unset we log the intended email at warn level
 * so the founder can still operate/test before wiring the key.
 */
const DEFAULT_FROM = 'Rekaman <founder@rekaman.io>';

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    logger.warn({ to: input.to, subject: input.subject }, 'RESEND_API_KEY unset — email NOT sent');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn({ status: res.status, body, to: input.to }, 'resend send failed');
    }
  } catch (err) {
    logger.warn({ err, to: input.to }, 'resend send error');
  }
}
