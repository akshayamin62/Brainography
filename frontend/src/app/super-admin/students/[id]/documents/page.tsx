'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SADocumentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/super-admin/students');
  }, [router]);
  return null;
}
