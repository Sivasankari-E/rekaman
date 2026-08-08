'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, token, ApiError } from '../../_lib/api';
import { Button, Input, Field, Alert } from '../../_components/ui';

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await auth.signup({
        companyName: companyName.trim(),
        email: email.trim(),
        password,
      });
      token.set(res.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">Start adding AR to your store in minutes.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Brand / company name" htmlFor="company">
          <Input
            id="company"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Woodcraft Chennai"
          />
        </Field>
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
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
