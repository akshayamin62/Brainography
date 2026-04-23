'use client';

import Link from 'next/link';
import { useMemo } from 'react';

export default function PublicBackHomeLink() {
  const href = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return '/';
      const user = JSON.parse(rawUser) as { role?: string; email?: string };
      if (user?.role === 'REVIEWER' || user?.email?.toLowerCase() === 'reviewer@admitra.io') {
        return '/reviewer/payment';
      }
    } catch {
      return '/';
    }
    return '/';
  }, []);

  return (
    <Link href={href} className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
      ← Back to Home
    </Link>
  );
}
