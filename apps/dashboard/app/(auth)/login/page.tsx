'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, token, ApiError } from '../../_lib/api';
import { Button, Input, Field, Alert } from '../../_components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await auth.login({ email: email.trim(), password });
      token.set(res.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">Sign in to your Rekaman dashboard.</p>

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
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New to Rekaman?{' '}
        <Link href="/signup" className="font-medium text-brand hover:text-brand-hover">
          Create an account
        </Link>
      </p>
    </div>
  );
}
