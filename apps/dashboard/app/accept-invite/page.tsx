'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { team, auth, ApiError } from '../_lib/api';
import { Logo } from '../_components/Logo';
import { Button, Spinner } from '../_components/ui';

type State =
  | { k: 'checking' }
  | { k: 'need-auth' }
  | { k: 'accepting' }
  | { k: 'done'; brandName: string; role: string }
  | { k: 'error'; message: string };

export default function AcceptInvitePage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ k: 'checking' });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setState({ k: 'error', message: 'This invite link is missing its token.' });
      return;
    }
    // Must be signed in to accept — the server matches the invite email to the
    // logged-in account.
    auth
      .me()
      .then(async () => {
        setState({ k: 'accepting' });
        try {
          const r = await team.accept(token);
          setState({ k: 'done', brandName: r.brandName, role: r.role });
        } catch (err) {
          setState({
            k: 'error',
            message: err instanceof ApiError ? err.message : 'Could not accept this invite.',
          });
        }
      })
      .catch(() => setState({ k: 'need-auth' }));
  }, []);

  // Preserve the invite link so login/signup can return here.
  const nextParam =
    typeof window !== 'undefined'
      ? `?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
      : '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-card">
        <Logo size="lg" />
        <div className="mt-6">
          {state.k === 'checking' && (
            <div className="flex items-center gap-3 text-muted">
              <Spinner className="text-brand" /> Checking your invite…
            </div>
          )}

          {state.k === 'accepting' && (
            <div className="flex items-center gap-3 text-muted">
              <Spinner className="text-brand" /> Joining the team…
            </div>
          )}

          {state.k === 'need-auth' && (
            <>
              <h1 className="text-lg font-semibold text-ink">Accept your invitation</h1>
              <p className="mt-2 text-sm text-muted">
                Sign in with the email this invite was sent to, then you’ll join the team
                automatically.
              </p>
              <div className="mt-5 flex gap-3">
                <Link href={`/login${nextParam}`} className="flex-1">
                  <Button className="w-full">Log in</Button>
                </Link>
                <Link href={`/signup${nextParam}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Create account
                  </Button>
                </Link>
              </div>
            </>
          )}

          {state.k === 'done' && (
            <>
              <h1 className="text-lg font-semibold text-ink">You’re in 🎉</h1>
              <p className="mt-2 text-sm text-muted">
                You joined <span className="font-medium text-ink">{state.brandName}</span> as{' '}
                <span className="font-medium text-ink">{state.role.toLowerCase()}</span>.
              </p>
              <Button className="mt-5 w-full" onClick={() => router.push('/dashboard')}>
                Go to dashboard
              </Button>
            </>
          )}

          {state.k === 'error' && (
            <>
              <h1 className="text-lg font-semibold text-ink">Invite problem</h1>
              <p className="mt-2 text-sm text-muted">{state.message}</p>
              <Button className="mt-5 w-full" onClick={() => router.push('/dashboard')}>
                Go to dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
