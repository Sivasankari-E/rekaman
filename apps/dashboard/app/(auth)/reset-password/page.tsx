'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, ApiError } from '../../_lib/api';
import { Button, Input, Field, Alert } from '../../_components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Read the token client-side (avoids useSearchParams' Suspense requirement).
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don’t match.');
      return;
    }
    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 1600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink">Password updated 🎉</h1>
        <p className="mt-2 text-sm text-muted">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted">Enter a new password for your account.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="New password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
