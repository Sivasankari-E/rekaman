'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from './_lib/api';
import { Spinner } from './_components/ui';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    // Cookie-only: probe the session, route accordingly.
    auth
      .me()
      .then(() => router.replace('/dashboard'))
      .catch(() => router.replace('/login'));
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="text-brand" />
    </div>
  );
}
