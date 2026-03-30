'use client';

import Navbar from '@/components/Navbar';
import AdminLayout from '@/components/AdminLayout';
import InstallerContent from '@/components/InstallerContent';
import { useAuth } from '@/hooks/useAuth';

export default function AdminInstallerPage() {
  const { user, loading } = useAuth('ADMIN');

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <AdminLayout user={user}>
        <InstallerContent />
      </AdminLayout>
    </>
  );
}
