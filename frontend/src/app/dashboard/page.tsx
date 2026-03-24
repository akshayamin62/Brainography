'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Legacy dashboard route - redirects to role-specific dashboard
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'SUPER_ADMIN') {
          router.replace('/super-admin/dashboard');
        } else if (user.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
