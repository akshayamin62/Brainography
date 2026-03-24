'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { studentAPI } from '@/lib/api';
import { Student } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminStudentProfilePage() {
  const { user, loading } = useAuth('ADMIN');
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(false);
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

  const fetchStudent = async () => {
    try {
      const res = await studentAPI.get(studentId);
      if (res.data.success) {
        const s = res.data.data;
        setStudent(s);
        populateForm(s);
      }
    } catch {
      toast.error('Failed to load student');
    } finally {
      setFetching(false);
    }
  };

  const populateForm = (s: Student) => {
    setFName(s.name); setFParentName(s.parentName); setFMobile(s.mobile);
    setFEmail(s.email); setFUniversity(s.university); setFStandard(s.standard);
    setFAddress(s.address); setFDob(s.dob); setFGender(s.gender);
  };

  useEffect(() => {
    if (user && studentId) fetchStudent();
  }, [user, studentId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await studentAPI.update(studentId, {
        name: fName, parentName: fParentName, mobile: fMobile, email: fEmail,
        university: fUniversity, standard: fStandard, address: fAddress, dob: fDob, gender: fGender,
      });
      if (res.data.success) {
        toast.success('Student updated!');
        setEditing(false);
        fetchStudent();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <>
        <Navbar />
        <AdminLayout user={user}>
          <div className="p-6 text-center text-gray-500">Student not found</div>
        </AdminLayout>
      </>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start py-2 border-b border-gray-100 last:border-0">
      <span className="w-36 text-sm font-medium text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <AdminLayout user={user}>
        <div className="p-6 max-w-3xl">
          <button onClick={() => router.push('/admin/students')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Students
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Student Profile</h1>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdate} className="p-6 space-y-3">
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
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
                    {submitting ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); if (student) populateForm(student); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <InfoRow label="Name" value={student.name} />
                <InfoRow label="Parent Name" value={student.parentName} />
                <InfoRow label="Email" value={student.email} />
                <InfoRow label="Mobile" value={student.mobile} />
                <InfoRow label="University" value={student.university} />
                <InfoRow label="Standard" value={student.standard} />
                <InfoRow label="Address" value={student.address} />
                <InfoRow label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : '—'} />
                <InfoRow label="Gender" value={student.gender} />
                <InfoRow label="Created" value={student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'} />
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
