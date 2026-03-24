'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { studentAPI } from '@/lib/api';
import { Student } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminStudentsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await studentAPI.list();
      if (res.data.success) setStudents(res.data.data);
    } catch {
      toast.error('Failed to fetch students');
    }
  };

  useEffect(() => {
    if (user) fetchStudents();
  }, [user]);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.university.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <SuperAdminLayout user={user}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or university..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">University</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No students found</td></tr>
                  ) : (
                    filtered.map((student, idx) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.mobile}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.university}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {typeof student.adminId === 'object' ? student.adminId?.name : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => router.push(`/super-admin/students/${student._id}/fingerprints`)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Fingerprints"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                              </svg>
                            </button>
                            <button
                              onClick={() => router.push(`/super-admin/students/${student._id}/documents`)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Documents"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SuperAdminLayout>
    </>
  );
}
