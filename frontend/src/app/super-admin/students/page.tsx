'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { studentAPI, documentAPI, BACKEND_URL, withToken } from '@/lib/api';
import { Student } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminStudentsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStudentIdRef = useRef<string>('');

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

  const handleUploadDoc = (studentId: string) => {
    uploadStudentIdRef.current = studentId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const studentId = uploadStudentIdRef.current;
    setUploadingId(studentId);
    const formData = new FormData();
    formData.append('document', e.target.files[0]);
    try {
      const res = await documentAPI.upload(studentId, formData);
      if (res.data.success) {
        toast.success('Document uploaded');
        fetchStudents();
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const handleDownloadDoc = (student: Student) => {
    if (!student.document) return;
    const link = document.createElement('a');
    link.href = withToken(`${BACKEND_URL}/uploads/student_docs/${student.document.filename}`);
    link.download = student.document.originalName;
    link.click();
  };

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

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or university..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

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
                            {/* Profile */}
                            <button
                              onClick={() => router.push(`/super-admin/students/${student._id}/profile`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </button>
                            {/* Fingerprints */}
                            <button
                              onClick={() => router.push(`/super-admin/students/${student._id}/fingerprints`)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Fingerprints"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                              </svg>
                            </button>
                            {/* Document - Upload/Reupload */}
                            <button
                              onClick={() => handleUploadDoc(student._id)}
                              disabled={uploadingId === student._id}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title={student.document ? 'Reupload Document' : 'Upload Document'}
                            >
                              {uploadingId === student._id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                              )}
                            </button>
                            {/* Document - Download (only if exists) */}
                            {student.document && (
                              <button
                                onClick={() => handleDownloadDoc(student)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title={`Download: ${student.document.originalName}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            )}
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
