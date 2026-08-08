'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { token } from './_lib/api';
import { Spinner } from './_components/ui';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(token.get() ? '/dashboard' : '/login');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="text-brand" />
    </div>
  );
}
