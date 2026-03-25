'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { studentAPI, adminAPI, documentAPI, BACKEND_URL, withToken } from '@/lib/api';
import { Student, User } from '@/types';
import { Country, State, City } from 'country-state-city';
import toast, { Toaster } from 'react-hot-toast';

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

export default function SuperAdminStudentsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStudentIdRef = useRef<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fAdminId, setFAdminId] = useState('');
  const [fFirstName, setFFirstName] = useState('');
  const [fMiddleName, setFMiddleName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fDob, setFDob] = useState('');
  const [fGender, setFGender] = useState('Male');
  const [fCountryCode, setFCountryCode] = useState('+91');
  const [fMobile, setFMobile] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fEducationLevel, setFEducationLevel] = useState('');
  const [fBoard, setFBoard] = useState('');
  const [fBoardFullName, setFBoardFullName] = useState('');
  const [fInstitutionName, setFInstitutionName] = useState('');
  const [fInstitutionCountry, setFInstitutionCountry] = useState('');
  const [fFieldOfStudy, setFFieldOfStudy] = useState('');
  const [fMedium, setFMedium] = useState('');
  const [fAddress, setFAddress] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fState, setFState] = useState('');
  const [fCity, setFCity] = useState('');
  const [fSiblings, setFSiblings] = useState('0');
  const [fFamilyStructure, setFFamilyStructure] = useState('');
  const [fMotherActivity, setFMotherActivity] = useState('');
  const [fFatherActivity, setFFatherActivity] = useState('');
  const [fHobbies, setFHobbies] = useState('');
  const [fGames, setFGames] = useState('');
  const [fOtherGames, setFOtherGames] = useState('');

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => fCountry ? State.getStatesOfCountry(fCountry) : [], [fCountry]);
  const cities = useMemo(() => fCountry && fState ? City.getCitiesOfState(fCountry, fState) : [], [fCountry, fState]);
  const phoneCodes = useMemo(() => {
    return countries.map(c => ({ code: c.phonecode.startsWith('+') ? c.phonecode : `+${c.phonecode}`, name: c.name, isoCode: c.isoCode })).sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  const showBoard = fEducationLevel === 'secondary_school' || fEducationLevel === 'higher_secondary_school';
  const showBoardFullName = showBoard && (fBoard === 'State Board' || fBoard === 'Other');
  const showFieldOfStudy = fEducationLevel && fEducationLevel !== 'secondary_school';

  // Admin company name list for dropdown
  const adminOptions = useMemo(() => admins.map(a => ({
    id: a._id || a.id || '',
    label: a.details?.companyName ? `${a.details.companyName}` : a.name,
  })), [admins]);

  const fetchStudents = async () => {
    try {
      const res = await studentAPI.list();
      if (res.data.success) setStudents(res.data.data);
    } catch { toast.error('Failed to fetch students'); }
  };

  const fetchAdmins = async () => {
    try {
      const res = await adminAPI.list();
      if (res.data.success) setAdmins(res.data.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { if (user) { fetchStudents(); fetchAdmins(); } }, [user]);

  const resetForm = () => {
    setFAdminId('');
    setFFirstName(''); setFMiddleName(''); setFLastName('');
    setFDob(''); setFGender('Male'); setFCountryCode('+91'); setFMobile(''); setFEmail('');
    setFEducationLevel(''); setFBoard(''); setFBoardFullName('');
    setFInstitutionName(''); setFInstitutionCountry(''); setFFieldOfStudy(''); setFMedium('');
    setFAddress(''); setFCountry(''); setFState(''); setFCity('');
    setFSiblings('0'); setFFamilyStructure(''); setFMotherActivity(''); setFFatherActivity('');
    setFHobbies(''); setFGames(''); setFOtherGames('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fAdminId) { toast.error('Please select an admin'); return; }
    setSubmitting(true);
    try {
      const res = await studentAPI.create({
        adminId: fAdminId,
        firstName: fFirstName, middleName: fMiddleName || undefined, lastName: fLastName,
        dob: fDob, gender: fGender, countryCode: fCountryCode, mobile: fMobile, email: fEmail,
        educationLevel: fEducationLevel, board: fBoard || undefined, boardFullName: fBoardFullName || undefined,
        institutionName: fInstitutionName,
        institutionCountry: fInstitutionCountry ? countries.find(c => c.isoCode === fInstitutionCountry)?.name || fInstitutionCountry : '',
        fieldOfStudy: fFieldOfStudy || undefined, mediumOfTeaching: fMedium,
        address: fAddress,
        country: fCountry ? countries.find(c => c.isoCode === fCountry)?.name || '' : '',
        state: fState ? states.find(s => s.isoCode === fState)?.name || '' : '',
        city: fCity,
        siblings: parseInt(fSiblings) || 0, familyStructure: fFamilyStructure,
        motherActivity: fMotherActivity, fatherActivity: fFatherActivity,
        hobbies: fHobbies || undefined, games: fGames, otherGames: fOtherGames || undefined,
      });
      if (res.data.success) {
        toast.success('Student added!');
        setShowAddModal(false); resetForm(); fetchStudents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally { setSubmitting(false); }
  };

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
      if (res.data.success) { toast.success('Document uploaded'); fetchStudents(); }
    } catch { toast.error('Upload failed'); }
    finally { setUploadingId(null); e.target.value = ''; }
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
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900';
  const selectCls = inputCls;
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionCls = 'text-sm font-semibold text-indigo-700 border-b border-indigo-200 pb-1 mb-3 mt-2';

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <SuperAdminLayout user={user}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
            <button onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          <div className="mb-4">
            <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Institution</th>
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
                        <td className="px-4 py-3 text-sm text-gray-600">{student.countryCode ? `${student.countryCode} ` : ''}{student.mobile}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.institutionName || student.university || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {typeof student.adminId === 'object' ? student.adminId?.name : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => router.push(`/super-admin/students/${student._id}/profile`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Profile">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </button>
                            <button onClick={() => router.push(`/super-admin/students/${student._id}/fingerprints`)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Fingerprints">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                              </svg>
                            </button>
                            <button onClick={() => handleUploadDoc(student._id)} disabled={uploadingId === student._id}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title={student.document ? 'Reupload Document' : 'Upload Document'}>
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
                            {student.document && (
                              <button onClick={() => handleDownloadDoc(student)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
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
                {/* Admin selection */}
                <div>
                  <label className={labelCls}>Admin (Company Name) *</label>
                  <select value={fAdminId} onChange={e => setFAdminId(e.target.value)} className={selectCls} required>
                    <option value="">Select Admin</option>
                    {adminOptions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>

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
                    <div className="flex items-center gap-4 mt-2">
                      {['Male', 'Female'].map(g => (
                        <label key={g} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                          <input type="radio" name="gender" value={g} checked={fGender === g} onChange={() => setFGender(g)} className="accent-indigo-600" />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Country Code</label>
                    <select value={fCountryCode} onChange={e => setFCountryCode(e.target.value)} className={selectCls}>
                      {phoneCodes.map(pc => <option key={pc.isoCode} value={pc.code}>{pc.code} ({pc.name})</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Mobile *</label><input type="tel" value={fMobile} onChange={e => setFMobile(e.target.value)} className={inputCls} required /></div>
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
                  <div><label className={labelCls}>Field of Study *</label><input type="text" value={fFieldOfStudy} onChange={e => setFFieldOfStudy(e.target.value)} className={inputCls} required /></div>
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
                      <option value="Homemaker">Homemaker</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Father&apos;s Activity *</label>
                    <select value={fFatherActivity} onChange={e => setFFatherActivity(e.target.value)} className={selectCls} required>
                      <option value="">Select</option>
                      <option value="Job">Job</option>
                      <option value="Business">Business</option>
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
                      <option value="None">None</option>
                    </select>
                  </div>
                  {(fGames === 'Indoor' || fGames === 'Outdoor') && (
                    <div><label className={labelCls}>Other Games</label><input type="text" value={fOtherGames} onChange={e => setFOtherGames(e.target.value)} className={inputCls} /></div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                    {submitting ? 'Adding...' : 'Add Student'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}
