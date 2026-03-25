'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI } from '@/lib/api';
import { User } from '@/types';
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const router = useRouter();
  const [admins, setAdmins] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive'>('');
  const [sortField, setSortField] = useState<'name' | 'email' | 'students' | 'createdAt' | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Form fields
  const [fFirstName, setFFirstName] = useState('');
  const [fMiddleName, setFMiddleName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fCountryCode, setFCountryCode] = useState('+91');
  const [fMobile, setFMobile] = useState('');
  const [fCompanyName, setFCompanyName] = useState('');
  const [fAddress, setFAddress] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fState, setFState] = useState('');
  const [fCity, setFCity] = useState('');

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => fCountry ? State.getStatesOfCountry(fCountry) : [], [fCountry]);
  const cities = useMemo(() => fCountry && fState ? City.getCitiesOfState(fCountry, fState) : [], [fCountry, fState]);

  const phoneCodes = useMemo(() => {
    return countries.map(c => ({
      code: c.phonecode.startsWith('+') ? c.phonecode : `+${c.phonecode}`,
      name: c.name,
      isoCode: c.isoCode,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

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

  const handleToggleActive = async (admin: User) => {
    const newStatus = admin.isActive === false ? true : false;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this admin?`)) return;
    const adminId = admin._id || admin.id || '';
    setTogglingId(adminId);
    try {
      const res = await adminAPI.update(adminId, { isActive: newStatus });
      if (res.data.success) {
        toast.success(`Admin ${action}d successfully`);
        fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action} admin`);
    } finally {
      setTogglingId(null);
    }
  };

  const resetForm = () => {
    setFFirstName(''); setFMiddleName(''); setFLastName('');
    setFEmail(''); setFCountryCode('+91'); setFMobile('');
    setFCompanyName(''); setFAddress('');
    setFCountry(''); setFState(''); setFCity('');
  };

  const getFormData = () => ({
    firstName: fFirstName,
    middleName: fMiddleName || undefined,
    lastName: fLastName,
    email: fEmail,
    countryCode: fCountryCode,
    phone: fMobile,
    companyName: fCompanyName || undefined,
    address: fAddress || undefined,
    country: fCountry ? countries.find(c => c.isoCode === fCountry)?.name : undefined,
    state: fState ? states.find(s => s.isoCode === fState)?.name : undefined,
    city: fCity || undefined,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fFirstName || !fLastName || !fEmail || !fCompanyName || !fMobile) {
      toast.error('First name, last name, email, company name, and mobile are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminAPI.create(getFormData());
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
      const res = await adminAPI.update(editingAdmin._id || editingAdmin.id || '', getFormData());
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
    const d = admin.details;
    setFFirstName(d?.firstName || admin.name?.split(' ')[0] || '');
    setFMiddleName(d?.middleName || '');
    setFLastName(d?.lastName || admin.name?.split(' ').slice(-1)[0] || '');
    setFEmail(admin.email);
    setFCountryCode(d?.countryCode || '+91');
    setFMobile(admin.phone || '');
    setFCompanyName(d?.companyName || '');
    setFAddress(d?.address || '');
    // Reverse-lookup country/state ISO codes from names
    const countryMatch = countries.find(c => c.name === d?.country);
    setFCountry(countryMatch?.isoCode || '');
    if (countryMatch) {
      const stateList = State.getStatesOfCountry(countryMatch.isoCode);
      const stateMatch = stateList.find(s => s.name === d?.state);
      setFState(stateMatch?.isoCode || '');
    } else {
      setFState('');
    }
    setFCity(d?.city || '');
    setShowEditModal(true);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className="inline-block ml-1 text-[10px] opacity-60">
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const filtered = useMemo(() => {
    let list = admins.filter((a) => {
      const q = search.toLowerCase();
      if (q && !a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q) && !(a.phone || '').toLowerCase().includes(q)) return false;
      if (filterStatus === 'active' && a.isActive === false) return false;
      if (filterStatus === 'inactive' && a.isActive !== false) return false;
      return true;
    });
    if (sortField) {
      list = [...list].sort((a, b) => {
        let va = '', vb = '';
        if (sortField === 'name') { va = a.details?.companyName || a.name; vb = b.details?.companyName || b.name; }
        else if (sortField === 'email') { va = a.email; vb = b.email; }
        else if (sortField === 'students') {
          return sortDir === 'asc'
            ? (a.studentCount ?? 0) - (b.studentCount ?? 0)
            : (b.studentCount ?? 0) - (a.studentCount ?? 0);
        }
        else if (sortField === 'createdAt') { va = a.createdAt || ''; vb = b.createdAt || ''; }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return list;
  }, [admins, search, filterStatus, sortField, sortDir]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const formFields = (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input type="text" value={fFirstName} onChange={(e) => setFFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
          <input type="text" value={fMiddleName} onChange={(e) => setFMiddleName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input type="text" value={fLastName} onChange={(e) => setFLastName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
          <select value={fCountryCode} onChange={(e) => setFCountryCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900">
            {phoneCodes.map((pc) => (
              <option key={pc.isoCode} value={pc.code}>{pc.code} ({pc.name})</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
          <input type="text" value={fMobile} onChange={(e) => setFMobile(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
        <input type="text" value={fCompanyName} onChange={(e) => setFCompanyName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input type="text" value={fAddress} onChange={(e) => setFAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <select value={fCountry} onChange={(e) => { setFCountry(e.target.value); setFState(''); setFCity(''); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900">
            <option value="">Select Country</option>
            {countries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select value={fState} onChange={(e) => { setFState(e.target.value); setFCity(''); }}
            disabled={!fCountry}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 disabled:opacity-50">
            <option value="">Select State</option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <select value={fCity} onChange={(e) => setFCity(e.target.value)}
            disabled={!fState}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 disabled:opacity-50">
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );

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

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input type="text" placeholder="Search by name, email, or phone..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {filterStatus && (
              <button onClick={() => setFilterStatus('')}
                className="text-sm text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('name')}>Name<SortIcon field="name" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('email')}>Email<SortIcon field="email" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('students')}>Students<SortIcon field="students" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('createdAt')}>Created On<SortIcon field="createdAt" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No admins found</td></tr>
                  ) : (
                    filtered.map((admin, idx) => (
                      <tr key={admin._id || admin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{admin.details?.companyName || admin.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{admin.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {admin.phone ? `${admin.details?.countryCode || ''} ${admin.phone}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{admin.studentCount ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(admin)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleToggleActive(admin)} disabled={togglingId === (admin._id || admin.id)}
                              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${admin.isActive !== false ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={admin.isActive !== false ? 'Deactivate' : 'Activate'}>
                              {togglingId === (admin._id || admin.id) ? '...' : (admin.isActive !== false ? 'Deactivate' : 'Activate')}
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
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xl mx-4 animate-scale-in max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Admin</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                {formFields}
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
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xl mx-4 animate-scale-in max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Admin</h2>
              <form onSubmit={handleEdit} className="space-y-3">
                {formFields}
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
