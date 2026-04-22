'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { counselorAPI, adminAPI } from '@/lib/api';
import { User } from '@/types';
import { Country } from 'country-state-city';
import toast, { Toaster } from 'react-hot-toast';

interface Counselor {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  studentCount?: number;
  adminName?: string;
  createdBy?: string;
  createdAt?: string;
}

export default function SuperAdminCounselorsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');

  // Form fields
  const [fAdminId, setFAdminId] = useState('');
  const [fFirstName, setFFirstName] = useState('');
  const [fMiddleName, setFMiddleName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhoneCode, setFPhoneCode] = useState('+91');
  const [fPhone, setFPhone] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  const phoneCodes = useMemo(() =>
    Country.getAllCountries()
      .map(c => ({ code: `+${c.phonecode.replace('+', '')}`, name: c.name, isoCode: c.isoCode }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  []);

  const fetchCounselors = useCallback(async () => {
    try {
      const res = await counselorAPI.listAll();
      if (res.data.success) setCounselors(res.data.data);
    } catch {
      toast.error('Failed to fetch counselors');
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await adminAPI.list();
      if (res.data.success) setAdmins(res.data.data);
    } catch {
      toast.error('Failed to fetch admins');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCounselors();
      fetchAdmins();
    }
  }, [user, fetchCounselors, fetchAdmins]);

  const resetForm = () => {
    setFAdminId('');
    setFFirstName('');
    setFMiddleName('');
    setFLastName('');
    setFEmail('');
    setFPhoneCode('+91');
    setFPhone('');
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await counselorAPI.update(editingId, {
          firstName: fFirstName,
          middleName: fMiddleName || undefined,
          lastName: fLastName,
          email: fEmail,
          phone: `${fPhoneCode} ${fPhone}`,
        });
        if (res.data.success) {
          toast.success('Counselor updated!');
          setShowAddModal(false);
          resetForm();
          fetchCounselors();
        }
      } else {
        const res = await counselorAPI.createForAdmin({
          firstName: fFirstName,
          middleName: fMiddleName || undefined,
          lastName: fLastName,
          email: fEmail,
          phone: `${fPhoneCode} ${fPhone}`,
          adminId: fAdminId,
        });
        if (res.data.success) {
          toast.success('Counselor added!');
          setShowAddModal(false);
          resetForm();
          fetchCounselors();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save counselor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (counselor: Counselor) => {
    const nameParts = counselor.name.split(' ');
    if (nameParts.length >= 3) {
      setFFirstName(nameParts[0]);
      setFMiddleName(nameParts.slice(1, -1).join(' '));
      setFLastName(nameParts[nameParts.length - 1]);
    } else if (nameParts.length === 2) {
      setFFirstName(nameParts[0]);
      setFMiddleName('');
      setFLastName(nameParts[1]);
    } else {
      setFFirstName(counselor.name);
      setFMiddleName('');
      setFLastName('');
    }
    setFEmail(counselor.email);
    setFAdminId(counselor.createdBy || '');
    if (counselor.phone) {
      const spaceIdx = counselor.phone.indexOf(' ');
      if (spaceIdx !== -1 && counselor.phone.startsWith('+')) {
        setFPhoneCode(counselor.phone.slice(0, spaceIdx));
        setFPhone(counselor.phone.slice(spaceIdx + 1));
      } else {
        setFPhoneCode('+91');
        setFPhone(counselor.phone.replace(/\D/g, ''));
      }
    } else {
      setFPhoneCode('+91');
      setFPhone('');
    }
    setEditingId(counselor._id);
    setShowAddModal(true);
  };

  const handleToggleActive = async (counselor: Counselor) => {
    try {
      const res = await counselorAPI.update(counselor._id, { isActive: !counselor.isActive });
      if (res.data.success) {
        toast.success(`Counselor ${counselor.isActive ? 'deactivated' : 'activated'}`);
        fetchCounselors();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = useMemo(() => {
    return counselors.filter(c => {
      const q = search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
      if (filterAdmin && c.createdBy !== filterAdmin) return false;
      return true;
    });
  }, [counselors, search, filterAdmin]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <SuperAdminLayout user={user}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Counselors</h1>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Counselor
            </button>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
            />
            <select
              value={filterAdmin}
              onChange={e => setFilterAdmin(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Admins</option>
              {admins.map(a => (
                <option key={a._id || a.id} value={a._id || a.id}>{a.name}</option>
              ))}
            </select>
            {(search || filterAdmin) && (
              <button onClick={() => { setSearch(''); setFilterAdmin(''); }} className="text-sm text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Students</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No counselors found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, idx) => (
                      <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-medium">{c.adminName || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.studentCount ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(c)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleToggleActive(c)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                c.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={c.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {c.isActive ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
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
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 animate-scale-in">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Edit Counselor' : 'Add New Counselor'}
              </h2>
              <form onSubmit={handleAdd} className="space-y-4">
                {/* Admin selector — only shown when creating */}
                {!editingId && (
                  <div>
                    <label className={labelCls}>Admin *</label>
                    <select
                      value={fAdminId}
                      onChange={e => setFAdminId(e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="">Select Admin</option>
                      {admins.map(a => (
                        <option key={a._id || a.id} value={a._id || a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input type="text" value={fFirstName} onChange={e => setFFirstName(e.target.value)} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Middle Name</label>
                    <input type="text" value={fMiddleName} onChange={e => setFMiddleName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name *</label>
                    <input type="text" value={fLastName} onChange={e => setFLastName(e.target.value)} className={inputCls} required />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} className={inputCls} required />
                </div>

                <div>
                  <label className={labelCls}>Phone Number *</label>
                  <div className="flex gap-2">
                    <select
                      value={fPhoneCode}
                      onChange={e => setFPhoneCode(e.target.value)}
                      className="w-32 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {phoneCodes.map(pc => (
                        <option key={pc.isoCode} value={pc.code}>{pc.code} ({pc.name})</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={fPhone}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        if (v.length <= 10) setFPhone(v);
                      }}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="10 digit number"
                      className={inputCls + ' flex-1'}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {submitting ? 'Saving...' : editingId ? 'Update Counselor' : 'Add Counselor'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}
