'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { studentAPI } from '@/lib/api';
import { Student } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminStudentsPage() {
  const { user, loading } = useAuth('ADMIN');
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fName, setFName] = useState('');
  const [fParentName, setFParentName] = useState('');
  const [fMobile, setFMobile] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fUniversity, setFUniversity] = useState('');
  const [fStandard, setFStandard] = useState('');
  const [fAddress, setFAddress] = useState('');
  const [fDob, setFDob] = useState('');
  const [fGender, setFGender] = useState('Male');

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

  const resetForm = () => {
    setFName(''); setFParentName(''); setFMobile(''); setFEmail('');
    setFUniversity(''); setFStandard(''); setFAddress(''); setFDob(''); setFGender('Male');
  };

  const getFormData = () => ({
    name: fName, parentName: fParentName, mobile: fMobile, email: fEmail,
    university: fUniversity, standard: fStandard, address: fAddress, dob: fDob, gender: fGender,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await studentAPI.create(getFormData());
      if (res.data.success) {
        toast.success('Student added!');
        setShowAddModal(false);
        resetForm();
        fetchStudents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    try {
      const res = await studentAPI.update(editingStudent._id, getFormData());
      if (res.data.success) {
        toast.success('Student updated!');
        setShowEditModal(false);
        setEditingStudent(null);
        fetchStudents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setFName(s.name); setFParentName(s.parentName); setFMobile(s.mobile); setFEmail(s.email);
    setFUniversity(s.university); setFStandard(s.standard); setFAddress(s.address); setFDob(s.dob); setFGender(s.gender);
    setShowEditModal(true);
  };

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  const formFields = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" value={fName} onChange={(e) => setFName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name *</label>
          <input type="text" value={fParentName} onChange={(e) => setFParentName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
          <input type="text" value={fMobile} onChange={(e) => setFMobile(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">University *</label>
          <input type="text" value={fUniversity} onChange={(e) => setFUniversity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
          <input type="text" value={fStandard} onChange={(e) => setFStandard(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
        <input type="text" value={fAddress} onChange={(e) => setFAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
          <input type="date" value={fDob} onChange={(e) => setFDob(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
          <select value={fGender} onChange={(e) => setFGender(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <AdminLayout user={user}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>

          <div className="mb-4">
            <input type="text" placeholder="Search students..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900" />
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No students found</td></tr>
                  ) : (
                    filtered.map((student, idx) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.mobile}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.university}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => router.push(`/admin/students/${student._id}/fingerprints`)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Fingerprints">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                              </svg>
                            </button>
                            <button onClick={() => router.push(`/admin/students/${student._id}/documents`)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Documents">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            <button onClick={() => openEdit(student)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Student</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                {formFields}
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                    {submitting ? 'Adding...' : 'Add Student'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Student</h2>
              <form onSubmit={handleEdit} className="space-y-3">
                {formFields}
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                    {submitting ? 'Updating...' : 'Update'}
                  </button>
                  <button type="button" onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
