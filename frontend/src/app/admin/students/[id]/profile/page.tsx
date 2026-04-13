'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { studentAPI } from '@/lib/api';
import { Student } from '@/types';
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

export default function AdminStudentProfilePage() {
  const { user, loading } = useAuth('ADMIN');
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Personal
  const [fFirstName, setFFirstName] = useState('');
  const [fMiddleName, setFMiddleName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fDob, setFDob] = useState('');
  const [fGender, setFGender] = useState('Male');
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
  const [fMediumOfTeaching, setFMediumOfTeaching] = useState('');
  // Address
  const [fAddress, setFAddress] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fState, setFState] = useState('');
  const [fCity, setFCity] = useState('');
  // Family
  const [fSiblings, setFSiblings] = useState(0);
  const [fFamilyStructure, setFFamilyStructure] = useState('');
  const [fMotherActivity, setFMotherActivity] = useState('');
  const [fFatherActivity, setFFatherActivity] = useState('');
  // Additional
  const [fHobbies, setFHobbies] = useState('');
  const [fGames, setFGames] = useState('');
  const [fOtherGames, setFOtherGames] = useState('');
  const [fStandard, setFStandard] = useState('');

  const phoneCodes = useMemo(() => {
    return Country.getAllCountries().map(c => ({
      code: `+${c.phonecode.replace('+', '')}`,
      name: c.name,
      isoCode: c.isoCode,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => {
    if (!fCountry) return [];
    return State.getStatesOfCountry(fCountry);
  }, [fCountry]);
  const cities = useMemo(() => {
    if (!fCountry || !fState) return [];
    return City.getCitiesOfState(fCountry, fState);
  }, [fCountry, fState]);

  const showBoard = fEducationLevel === 'secondary_school' || fEducationLevel === 'higher_secondary_school';
  const showBoardFullName = showBoard && (fBoard === 'State Board' || fBoard === 'Other');
  const showFieldOfStudy = !!fEducationLevel && fEducationLevel !== 'secondary_school';
  const showStandard = fEducationLevel === 'secondary_school' || fEducationLevel === 'higher_secondary_school';

  const fetchStudent = useCallback(async () => {
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
  }, [studentId]);

  const populateForm = (s: Student) => {
    setFFirstName(s.firstName || '');
    setFMiddleName(s.middleName || '');
    setFLastName(s.lastName || '');
    setFDob(s.dob || '');
    setFGender(s.gender || 'Male');
    setFCountryCode(s.countryCode || '+91');
    setFMobile(s.mobile || '');
    setFEmail(s.email || '');
    setFEducationLevel(s.educationLevel || '');
    setFBoard(s.board || '');
    setFBoardFullName(s.boardFullName || '');
    setFInstitutionName(s.institutionName || '');
    setFInstitutionCountry(s.institutionCountry || '');
    setFFieldOfStudy(s.fieldOfStudy || '');
    setFMediumOfTeaching(s.mediumOfTeaching || '');
    setFAddress(s.address || '');
    setFCountry(s.country || '');
    setFState(s.state || '');
    setFCity(s.city || '');
    setFSiblings(s.siblings ?? 0);
    setFFamilyStructure(s.familyStructure || '');
    setFMotherActivity(s.motherActivity || '');
    setFFatherActivity(s.fatherActivity || '');
    setFHobbies(s.hobbies || '');
    setFGames(s.games || '');
    setFOtherGames(s.otherGames || '');
    setFStandard(s.standard || '');
  };

  useEffect(() => {
    if (user && studentId) fetchStudent();
  }, [user, studentId, fetchStudent]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await studentAPI.update(studentId, {
        firstName: fFirstName, middleName: fMiddleName, lastName: fLastName,
        dob: fDob, gender: fGender, countryCode: fCountryCode, mobile: fMobile, email: fEmail,
        educationLevel: fEducationLevel,
        board: showBoard ? fBoard : '',
        boardFullName: showBoardFullName ? fBoardFullName : '',
        institutionName: fInstitutionName, institutionCountry: fInstitutionCountry,
        fieldOfStudy: showFieldOfStudy ? fFieldOfStudy : '',
        mediumOfTeaching: fMediumOfTeaching,
        address: fAddress, country: fCountry, state: fState, city: fCity,
        siblings: fSiblings, familyStructure: fFamilyStructure,
        motherActivity: fMotherActivity, fatherActivity: fFatherActivity,
        hobbies: fHobbies, games: fGames,
        otherGames: (fGames === 'Indoor' || fGames === 'Outdoor' || fGames === 'Both') ? fOtherGames : '',
        standard: showStandard ? fStandard : '',
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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

  const educLabel = EDUCATION_LEVELS.find(e => e.value === student.educationLevel)?.label || student.educationLevel || '—';
  const boardLabel = BOARD_OPTIONS.find(b => b.value === student.board)?.label || student.board || '';
  const countryLabel = countries.find(c => c.isoCode === student.country)?.name || student.country || '—';
  const stateLabel = student.country ? (State.getStatesOfCountry(student.country).find(s => s.isoCode === student.state)?.name || student.state || '—') : '—';
  const instCountryLabel = countries.find(c => c.isoCode === student.institutionCountry)?.name || student.institutionCountry || '—';

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="py-2">
      <span className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || '—'}</span>
    </div>
  );

  const SectionHead = ({ title }: { title: string }) => (
    <div className="col-span-full pt-5 pb-2 first:pt-0">
      <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1">{title}</h3>
    </div>
  );

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900";

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <AdminLayout user={user}>
        <div className="p-6 mx-auto">
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
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdate} className="p-6 space-y-3">
                {/* Personal */}
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide pb-1">Personal Information</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input type="text" value={fFirstName} onChange={e => setFFirstName(e.target.value)} className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input type="text" value={fMiddleName} onChange={e => setFMiddleName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input type="text" value={fLastName} onChange={e => setFLastName(e.target.value)} className={inputCls} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                    <input type="date" value={fDob} onChange={e => setFDob(e.target.value)} className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                    <div className="flex items-center gap-4 mt-2">
                      {['Male', 'Female'].map(g => (
                        <label key={g} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                          <input type="radio" name="editGender" value={g} checked={fGender === g} onChange={() => setFGender(g)}
                            className="accent-blue-600" /> {g}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
                    <div className="flex gap-2">
                      <select value={fCountryCode} onChange={e => setFCountryCode(e.target.value)} className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900">
                        {phoneCodes.map(pc => <option key={pc.isoCode} value={pc.code}>{pc.code} ({pc.name})</option>)}
                      </select>
                      <input type="tel" value={fMobile} onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setFMobile(v); }} maxLength={10} pattern="[0-9]{10}" placeholder="10 digit number" className={inputCls + " flex-1"} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} className={inputCls} required />
                  </div>
                </div>

                {/* Academic */}
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide pt-3 pb-1">Academic Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Education Level *</label>
                    <select value={fEducationLevel} onChange={e => { setFEducationLevel(e.target.value); setFBoard(''); setFBoardFullName(''); setFFieldOfStudy(''); }} className={inputCls} required>
                      <option value="">Select</option>
                      {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  {showBoard && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Board *</label>
                      <select value={fBoard} onChange={e => { setFBoard(e.target.value); setFBoardFullName(''); }} className={inputCls} required>
                        <option value="">Select</option>
                        {BOARD_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {showBoardFullName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Board Full Name *</label>
                    <input type="text" value={fBoardFullName} onChange={e => setFBoardFullName(e.target.value)} className={inputCls} required />
                  </div>
                )}
                {showStandard && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
                    <input type="number" min="1" max="12" value={fStandard} onChange={e => setFStandard(e.target.value)} className={inputCls} required />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label>
                    <input type="text" value={fInstitutionName} onChange={e => setFInstitutionName(e.target.value)} className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution Country *</label>
                    <select value={fInstitutionCountry} onChange={e => setFInstitutionCountry(e.target.value)} className={inputCls} required>
                      <option value="">Select</option>
                      {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                {showFieldOfStudy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                    <input type="text" value={fFieldOfStudy} onChange={e => setFFieldOfStudy(e.target.value)} className={inputCls} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medium of Teaching *</label>
                  <input type="text" value={fMediumOfTeaching} onChange={e => setFMediumOfTeaching(e.target.value)} className={inputCls} required />
                </div>

                {/* Address */}
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide pt-3 pb-1">Address</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input type="text" value={fAddress} onChange={e => setFAddress(e.target.value)} className={inputCls} required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <select value={fCountry} onChange={e => { setFCountry(e.target.value); setFState(''); setFCity(''); }} className={inputCls} required>
                      <option value="">Select</option>
                      {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <select value={fState} onChange={e => { setFState(e.target.value); setFCity(''); }} className={inputCls} required>
                      <option value="">Select</option>
                      {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <select value={fCity} onChange={e => setFCity(e.target.value)} className={inputCls} required>
                      <option value="">Select</option>
                      {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Family */}
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide pt-3 pb-1">Family Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No. of Siblings</label>
                    <select value={fSiblings} onChange={e => setFSiblings(Number(e.target.value))} className={inputCls}>
                      {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Family Structure *</label>
                    <select value={fFamilyStructure} onChange={e => setFFamilyStructure(e.target.value)} className={inputCls} required>
                      <option value="">Select</option>
                      <option value="Nuclear">Nuclear</option>
                      <option value="Joint">Joint</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother&apos;s Activity *</label>
                    <select value={fMotherActivity} onChange={e => setFMotherActivity(e.target.value)} className={inputCls} required>
                      <option value="">Select</option>
                      <option value="Job">Job</option>
                      <option value="Business">Business</option>
                      <option value="Service">Service</option>
                      <option value="Homemaker">Homemaker</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father&apos;s Activity *</label>
                    <select value={fFatherActivity} onChange={e => setFFatherActivity(e.target.value)} className={inputCls} required>
                      <option value="">Select</option>
                      <option value="Job">Job</option>
                      <option value="Business">Business</option>
                      <option value="Service">Service</option>
                      <option value="Professional">Professional</option>
                      <option value="Homemaker">Homemaker</option>
                    </select>
                  </div>
                </div>

                {/* Additional */}
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide pt-3 pb-1">Additional Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies</label>
                  <input type="text" value={fHobbies} onChange={e => setFHobbies(e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Games *</label>
                    <select value={fGames} onChange={e => { setFGames(e.target.value); setFOtherGames(''); }} className={inputCls} required>
                      <option value="">Select</option>
                      <option value="Indoor">Indoor</option>
                      <option value="Outdoor">Outdoor</option>
                      <option value="Both">Both</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  {(fGames === 'Indoor' || fGames === 'Outdoor' || fGames === 'Both') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specify Games</label>
                      <input type="text" value={fOtherGames} onChange={e => setFOtherGames(e.target.value)} className={inputCls} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                    {submitting ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); if (student) populateForm(student); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
                <SectionHead title="Personal Information" />
                <InfoRow label="First Name" value={student.firstName} />
                <InfoRow label="Middle Name" value={student.middleName || ''} />
                <InfoRow label="Last Name" value={student.lastName} />
                <InfoRow label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : '—'} />
                <InfoRow label="Gender" value={student.gender} />
                <InfoRow label="Email" value={student.email} />
                <InfoRow label="Mobile" value={`${student.countryCode || ''} ${student.mobile}`} />

                <SectionHead title="Academic Information" />
                <InfoRow label="Education Level" value={educLabel} />
                {student.board && <InfoRow label="Board" value={boardLabel} />}
                {student.boardFullName && <InfoRow label="Board Full Name" value={student.boardFullName} />}
                {student.standard && <InfoRow label="Standard" value={student.standard} />}
                <InfoRow label="Institution" value={student.institutionName} />
                <InfoRow label="Institution Country" value={instCountryLabel} />
                {student.fieldOfStudy && <InfoRow label="Field of Study" value={student.fieldOfStudy} />}
                <InfoRow label="Medium of Teaching" value={student.mediumOfTeaching} />

                <SectionHead title="Address" />
                <InfoRow label="Address" value={student.address} />
                <InfoRow label="Country" value={countryLabel} />
                <InfoRow label="State" value={stateLabel} />
                <InfoRow label="City" value={student.city} />

                <SectionHead title="Family Information" />
                <InfoRow label="Siblings" value={String(student.siblings ?? 0)} />
                <InfoRow label="Family Structure" value={student.familyStructure} />
                <InfoRow label="Mother's Activity" value={student.motherActivity} />
                <InfoRow label="Father's Activity" value={student.fatherActivity} />

                <SectionHead title="Additional Information" />
                <InfoRow label="Hobbies" value={student.hobbies || ''} />
                <InfoRow label="Games" value={student.games} />
                {student.otherGames && <InfoRow label="Specified Games" value={student.otherGames} />}

                <SectionHead title="System Information" />
                <InfoRow label="Created" value={student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'} />
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
