'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI } from '@/lib/api';
import { User } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const [admins, setAdmins] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAdmins = async () => {
    try {
      const res = await adminAPI.list();
      if (res.data.success) setAdmins(res.data.data);
    } catch {
      toast.error('Failed to fetch admins');
    }
  };

  useEffect(() => {
    if (user) fetchAdmins();
  }, [user]);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminAPI.create({ name: formName, email: formEmail, phone: formPhone || undefined });
      if (res.data.success) {
        toast.success('Admin created successfully!');
        setShowAddModal(false);
        resetForm();
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSubmitting(true);
    try {
      const res = await adminAPI.update(editingAdmin._id || editingAdmin.id || '', { name: formName, email: formEmail, phone: formPhone });
      if (res.data.success) {
        toast.success('Admin updated');
        setShowEditModal(false);
        setEditingAdmin(null);
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update admin');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (admin: User) => {
    setEditingAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormPhone(admin.phone || '');
    setShowEditModal(true);
  };

  const filtered = admins.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.phone || '').toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Admin
            </button>
          </div>

          <div className="mb-4">
            <input type="text" placeholder="Search by name, email, or phone..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No admins found</td></tr>
                  ) : (
                    filtered.map((admin, idx) => (
                      <tr key={admin._id || admin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{admin.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{admin.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{admin.phone || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${admin.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {admin.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openEdit(admin)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Admin</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {submitting ? 'Creating...' : 'Create Admin'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 animate-scale-in">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Admin</h2>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {submitting ? 'Updating...' : 'Update Admin'}
                  </button>
                  <button type="button" onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
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
