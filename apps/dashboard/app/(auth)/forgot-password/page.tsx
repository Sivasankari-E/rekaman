'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth, ApiError } from '../../_lib/api';
import { Button, Input, Field, Alert } from '../../_components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.forgotPassword(email.trim());
      setSent(true); // always succeeds (no account-existence leak)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Check your email</h1>
        <p className="mt-2 text-sm text-muted">
          If an account exists for <span className="font-medium text-ink">{email}</span>, we’ve sent a
          password-reset link. It expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-hover"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted">
        Enter your email and we’ll send you a reset link.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@brand.com"
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
