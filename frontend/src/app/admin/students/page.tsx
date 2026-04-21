'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { studentAPI, BACKEND_URL, withToken } from '@/lib/api';
import { Student } from '@/types';
import { Country, State, City } from 'country-state-city';
import toast, { Toaster } from 'react-hot-toast';
import PaymentButton from '@/components/PaymentButton';

const EDUCATION_LEVELS = [
  { label: 'Secondary School', value: 'secondary_school' },
  { label: 'Higher Secondary School', value: 'higher_secondary_school' },
  { label: 'Associate Degree', value: 'associate' },
  { label: "Bachelor's Degree", value: 'bachelors' },
  { label: "Master's Degree", value: 'masters' },
  { label: 'Doctorate', value: 'doctorate' },
];
const BOARD_OPTIONS = [
  { label: 'CBSE', value: 'CBSE' },
  { label: 'ICSE', value: 'ICSE' },
  { label: 'IGCSE', value: 'IGCSE' },
  { label: 'IB/Cambridge', value: 'IB_Cambridge' },
  { label: 'State Board', value: 'State Board' },
  { label: 'Other', value: 'Other' },
];

export default function AdminStudentsPage() {
  const { user, loading } = useAuth('ADMIN');
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterEducation, setFilterEducation] = useState('');
  const [sortField, setSortField] = useState<'name' | 'email' | 'createdAt' | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Personal
  const [fFirstName, setFFirstName] = useState('');
  const [fMiddleName, setFMiddleName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fDob, setFDob] = useState('');
  const [fGender, setFGender] = useState('');
  const [fCountryCode, setFCountryCode] = useState('+91');
  const [fMobile, setFMobile] = useState('');
  const [fEmail, setFEmail] = useState('');
  // Academic
  const [fEducationLevel, setFEducationLevel] = useState('');
  const [fBoard, setFBoard] = useState('');
  const [fBoardFullName, setFBoardFullName] = useState('');
  const [fInstitutionName, setFInstitutionName] = useState('');
  const [fInstitutionCountry, setFInstitutionCountry] = useState('');
  const [fFieldOfStudy, setFFieldOfStudy] = useState('');
  const [fMedium, setFMedium] = useState('');
  // Address
  const [fAddress, setFAddress] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fState, setFState] = useState('');
  const [fCity, setFCity] = useState('');
  // Family
  const [fSiblings, setFSiblings] = useState('0');
  const [fFamilyStructure, setFFamilyStructure] = useState('');
  const [fMotherActivity, setFMotherActivity] = useState('');
  const [fFatherActivity, setFFatherActivity] = useState('');
  // Additional
  const [fHobbies, setFHobbies] = useState('');
  const [fGames, setFGames] = useState('');
  const [fOtherGames, setFOtherGames] = useState('');
  const [fStandard, setFStandard] = useState('');

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => fCountry ? State.getStatesOfCountry(fCountry) : [], [fCountry]);
  const cities = useMemo(() => fCountry && fState ? City.getCitiesOfState(fCountry, fState) : [], [fCountry, fState]);
  const phoneCodes = useMemo(() => {
    return countries.map(c => ({ code: c.phonecode.startsWith('+') ? c.phonecode : `+${c.phonecode}`, name: c.name, isoCode: c.isoCode })).sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  const showBoard = fEducationLevel === 'secondary_school' || fEducationLevel === 'higher_secondary_school';
  const showBoardFullName = showBoard && (fBoard === 'State Board' || fBoard === 'Other');
  const showFieldOfStudy = fEducationLevel && fEducationLevel !== 'secondary_school';
  const showStandard = fEducationLevel === 'secondary_school' || fEducationLevel === 'higher_secondary_school';

  const fetchStudents = useCallback(async () => {
    try {
      const res = await studentAPI.list();
      if (res.data.success) setStudents(res.data.data);
    } catch { toast.error('Failed to fetch students'); }
  }, []);

  useEffect(() => { if (user) fetchStudents(); }, [user, fetchStudents]);

  const resetForm = () => {
    setFFirstName(''); setFMiddleName(''); setFLastName('');
    setFDob(''); setFGender(''); setFCountryCode('+91'); setFMobile(''); setFEmail('');
    setFEducationLevel(''); setFBoard(''); setFBoardFullName('');
    setFInstitutionName(''); setFInstitutionCountry(''); setFFieldOfStudy(''); setFMedium('');
    setFAddress(''); setFCountry(''); setFState(''); setFCity('');
    setFSiblings('0'); setFFamilyStructure(''); setFMotherActivity(''); setFFatherActivity('');
    setFHobbies(''); setFGames(''); setFOtherGames(''); setFStandard('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await studentAPI.create({
        firstName: fFirstName, middleName: fMiddleName || undefined, lastName: fLastName,
        dob: fDob, gender: fGender, countryCode: fCountryCode, mobile: fMobile, email: fEmail,
        educationLevel: fEducationLevel, board: fBoard || undefined, boardFullName: fBoardFullName || undefined,
        institutionName: fInstitutionName,
        institutionCountry: fInstitutionCountry || '',
        fieldOfStudy: fFieldOfStudy || undefined, mediumOfTeaching: fMedium,
        address: fAddress,
        country: fCountry || '',
        state: fState || '',
        city: fCity,
        siblings: parseInt(fSiblings) || 0, familyStructure: fFamilyStructure,
        motherActivity: fMotherActivity, fatherActivity: fFatherActivity,
        hobbies: fHobbies || undefined, games: fGames, otherGames: fOtherGames || undefined,
        standard: showStandard ? fStandard : undefined,
      });
      if (res.data.success) {
        toast.success('Student added!');
        setShowAddModal(false); resetForm(); fetchStudents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally { setSubmitting(false); }
  };

  const handleDownloadDoc = (student: Student) => {
    if (!student.document) return;
    const link = document.createElement('a');
    link.href = withToken(`${BACKEND_URL}/uploads/student_docs/${student.document.filename}`);
    link.download = student.document.originalName;
    link.click();
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
    let list = students.filter((s) => {
      const q = search.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      if (filterGender && s.gender !== filterGender) return false;
      if (filterEducation && s.educationLevel !== filterEducation) return false;
      return true;
    });
    if (sortField) {
      list = [...list].sort((a, b) => {
        let va = '', vb = '';
        if (sortField === 'name') { va = a.name; vb = b.name; }
        else if (sortField === 'email') { va = a.email; vb = b.email; }
        else if (sortField === 'createdAt') { va = a.createdAt || ''; vb = b.createdAt || ''; }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return list;
  }, [students, search, filterGender, filterEducation, sortField, sortDir]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900';
  const selectCls = inputCls;
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionCls = 'text-sm font-semibold text-blue-700 border-b border-blue-200 pb-1 mb-3 mt-2';

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <AdminLayout user={user}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <button onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm" />
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500">
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select value={filterEducation} onChange={e => setFilterEducation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500">
              <option value="">All Education</option>
              {EDUCATION_LEVELS.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
            </select>
            {(filterGender || filterEducation) && (
              <button onClick={() => { setFilterGender(''); setFilterEducation(''); }}
                className="text-sm text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Report No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('name')}>Name<SortIcon field="name" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('email')}>Email<SortIcon field="email" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('createdAt')}>Created On<SortIcon field="createdAt" /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Added By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No students found</td></tr>
                  ) : (
                    filtered.map((student, idx) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-700">{student.reportNo || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.countryCode ? `${student.countryCode} ` : ''}{student.mobile}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.counselorId && typeof student.counselorId === 'object' ? (student.counselorId as any).name : 'Self'}</td>
                        <td className="px-4 py-3">
                          <PaymentButton studentId={student._id} studentName={student.name} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => router.push(`/admin/students/${student._id}/profile`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Profile">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </button>
                            <button onClick={() => router.push(`/admin/students/${student._id}/fingerprints`)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Fingerprints">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6a6 6 0 0 1 5.5 3M8.5 22c.7-2.3 1-4.5 1-7 0-2.2.8-4 3-4.5M14 13c0 2-.5 4-1.5 7" />
                              </svg>
                            </button>
                            {student.document && (
                              <button onClick={() => handleDownloadDoc(student)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title={`Download: ${student.document.originalName}`}>
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

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-4 animate-scale-in max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Student</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                {/* Personal Information */}
                <div className={sectionCls}>Personal Information</div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelCls}>First Name *</label><input type="text" value={fFirstName} onChange={e => setFFirstName(e.target.value)} className={inputCls} required /></div>
                  <div><label className={labelCls}>Middle Name</label><input type="text" value={fMiddleName} onChange={e => setFMiddleName(e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Last Name *</label><input type="text" value={fLastName} onChange={e => setFLastName(e.target.value)} className={inputCls} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Date of Birth *</label><input type="date" value={fDob} onChange={e => setFDob(e.target.value)} className={inputCls} required /></div>
                  <div>
                    <label className={labelCls}>Gender *</label>
                    <select value={fGender} onChange={e => setFGender(e.target.value)} className={selectCls} required>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Country Code</label>
                    <select value={fCountryCode} onChange={e => setFCountryCode(e.target.value)} className={selectCls}>
                      {phoneCodes.map(pc => <option key={pc.isoCode} value={pc.code}>{pc.code} ({pc.name})</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Mobile *</label><input type="tel" value={fMobile} onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setFMobile(v); }} maxLength={10} pattern="[0-9]{10}" className={inputCls} required placeholder="10 digit number" /></div>
                  <div><label className={labelCls}>Email *</label><input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} className={inputCls} required /></div>
                </div>

                {/* Academic Information */}
                <div className={sectionCls}>Academic Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Education Level *</label>
                    <select value={fEducationLevel} onChange={e => { setFEducationLevel(e.target.value); setFBoard(''); setFBoardFullName(''); }} className={selectCls} required>
                      <option value="">Select</option>
                      {EDUCATION_LEVELS.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                    </select>
                  </div>
                  {showBoard && (
                    <div>
                      <label className={labelCls}>Board *</label>
                      <select value={fBoard} onChange={e => { setFBoard(e.target.value); setFBoardFullName(''); }} className={selectCls} required>
                        <option value="">Select</option>
                        {BOARD_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {showBoardFullName && (
                  <div><label className={labelCls}>Full Name of Board *</label><input type="text" value={fBoardFullName} onChange={e => setFBoardFullName(e.target.value)} className={inputCls} placeholder="Enter full name of your board" required /></div>
                )}
                {showStandard && (
                  <div><label className={labelCls}>Standard *</label><input type="number" min="1" max="12" value={fStandard} onChange={e => setFStandard(e.target.value)} className={inputCls} placeholder="e.g. 10" required /></div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Institution Name *</label><input type="text" value={fInstitutionName} onChange={e => setFInstitutionName(e.target.value)} className={inputCls} required /></div>
                  <div>
                    <label className={labelCls}>Country of Institution *</label>
                    <select value={fInstitutionCountry} onChange={e => setFInstitutionCountry(e.target.value)} className={selectCls} required>
                      <option value="">Select</option>
                      {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                {showFieldOfStudy && (
                  <div><label className={labelCls}>Field of Study *</label><input type="text" value={fFieldOfStudy} onChange={e => setFFieldOfStudy(e.target.value)} className={inputCls} placeholder={fEducationLevel === 'higher_secondary_school' ? 'e.g. PCB, PCM, Commerce, Arts' : fEducationLevel === 'bachelors' ? 'e.g. BBA, B.Tech, B.Sc, B.Com' : fEducationLevel === 'masters' ? 'e.g. MBA, M.Tech, M.Sc, M.Com' : fEducationLevel === 'doctorate' ? 'e.g. Ph.D, D.Sc, M.D' : fEducationLevel === 'associate' ? 'e.g. Diploma, Polytechnic' : 'Enter field of study'} required /></div>
                )}
                <div>
                  <label className={labelCls}>Medium of Teaching *</label>
                  <select value={fMedium} onChange={e => setFMedium(e.target.value)} className={selectCls} required>
                    <option value="">Select</option>
                    <option value="English">English</option>
                    <option value="Vernacular">Vernacular</option>
                  </select>
                </div>

                {/* Address Information */}
                <div className={sectionCls}>Address Information</div>
                <div><label className={labelCls}>Address *</label><textarea value={fAddress} onChange={e => setFAddress(e.target.value)} className={inputCls} rows={2} required /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Country *</label>
                    <select value={fCountry} onChange={e => { setFCountry(e.target.value); setFState(''); setFCity(''); }} className={selectCls} required>
                      <option value="">Select</option>
                      {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>State *</label>
                    <select value={fState} onChange={e => { setFState(e.target.value); setFCity(''); }} disabled={!fCountry} className={`${selectCls} disabled:opacity-50`} required>
                      <option value="">Select</option>
                      {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>City *</label>
                    <select value={fCity} onChange={e => setFCity(e.target.value)} disabled={!fState} className={`${selectCls} disabled:opacity-50`} required>
                      <option value="">Select</option>
                      {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Family Information */}
                <div className={sectionCls}>Family Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Siblings</label>
                    <select value={fSiblings} onChange={e => setFSiblings(e.target.value)} className={selectCls}>
                      {[0,1,2,3,4,5].map(n => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Family Structure *</label>
                    <select value={fFamilyStructure} onChange={e => setFFamilyStructure(e.target.value)} className={selectCls} required>
                      <option value="">Select</option>
                      <option value="Joint">Joint</option>
                      <option value="Nuclear">Nuclear</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Mother&apos;s Activity *</label>
                    <select value={fMotherActivity} onChange={e => setFMotherActivity(e.target.value)} className={selectCls} required>
                      <option value="">Select</option>
                      <option value="Job">Job</option>
                      <option value="Business">Business</option>
                      <option value="Service">Service</option>
                      <option value="Homemaker">Homemaker</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Father&apos;s Activity *</label>
                    <select value={fFatherActivity} onChange={e => setFFatherActivity(e.target.value)} className={selectCls} required>
                      <option value="">Select</option>
                      <option value="Job">Job</option>
                      <option value="Business">Business</option>
                      <option value="Service">Service</option>
                      <option value="Professional">Professional</option>
                      <option value="Homemaker">Homemaker</option>
                    </select>
                  </div>
                </div>

                {/* Additional Information */}
                <div className={sectionCls}>Additional Information</div>
                <div><label className={labelCls}>Hobbies</label><input type="text" value={fHobbies} onChange={e => setFHobbies(e.target.value)} className={inputCls} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Games *</label>
                    <select value={fGames} onChange={e => setFGames(e.target.value)} className={selectCls} required>
                      <option value="">Select</option>
                      <option value="Indoor">Indoor</option>
                      <option value="Outdoor">Outdoor</option>
                      <option value="Both">Both</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  {(fGames === 'Indoor' || fGames === 'Outdoor' || fGames === 'Both') && (
                    <div><label className={labelCls}>Other Games</label><input type="text" value={fOtherGames} onChange={e => setFOtherGames(e.target.value)} className={inputCls} /></div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {submitting ? 'Adding...' : 'Add Student'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)}
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
