'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { documentAPI, studentAPI, BACKEND_URL, withToken } from '@/lib/api';
import { Student, StudentDoc } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function SADocumentsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [documents, setDocuments] = useState<StudentDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [studentRes, docsRes] = await Promise.all([
        studentAPI.get(studentId),
        documentAPI.list(studentId),
      ]);
      if (studentRes.data.success) setStudent(studentRes.data.data);
      if (docsRes.data.success) setDocuments(docsRes.data.data);
    } catch {
      toast.error('Failed to load data');
    }
  }, [studentId]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('document', e.target.files[0]);
    try {
      const res = await documentAPI.upload(studentId, formData);
      if (res.data.success) {
        toast.success('Document uploaded');
        fetchData();
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = (filename: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = withToken(`${BACKEND_URL}/uploads/student_docs/${filename}`);
    link.download = originalName;
    link.click();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) return '🖼️';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    return '📎';
  };

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <SuperAdminLayout user={user}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              {student && <p className="text-gray-600 mt-1">Student: {student.name}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{documents.length} document(s)</span>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm">
                {uploading ? 'Uploading...' : 'Upload Document'}
                <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>

          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">No documents uploaded for this student</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">File</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Uploaded</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(doc.originalName)}</span>
                          <span className="text-sm font-medium text-gray-900">{doc.originalName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDownload(doc.filename, doc.originalName)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors">
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}
