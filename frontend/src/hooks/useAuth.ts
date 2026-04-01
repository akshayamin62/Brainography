'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User } from '@/types';

export function useAuth(requiredRole?: string) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.replace('/login');
          return;
        }

        // Check if token has expired on the client side (7-day session)
        const expiry = localStorage.getItem('tokenExpiry');
        if (expiry && Date.now() > Number(expiry)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenExpiry');
          router.replace('/login');
          return;
        }

        const response = await authAPI.getProfile();
        const userData = response.data.data.user;

        if (requiredRole && userData.role !== requiredRole) {
          // Redirect to correct dashboard
          if (userData.role === 'SUPER_ADMIN') router.replace('/super-admin/dashboard');
          else if (userData.role === 'ADMIN') router.replace('/admin/dashboard');
          else if (userData.role === 'COUNSELOR') router.replace('/counselor/dashboard');
          else router.replace('/dashboard');
          return;
        }

        setUser(userData);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiry');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, requiredRole]);

  return { user, loading };
}
