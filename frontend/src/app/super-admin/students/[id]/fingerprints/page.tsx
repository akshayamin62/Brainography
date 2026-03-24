'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { fingerprintAPI, studentAPI, BACKEND_URL } from '@/lib/api';
import { Student, FingerprintData } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const FINGER_POSITIONS = {
  left: [
    { id: 'L1', label: 'Thumb' },
    { id: 'L2', label: 'Index' },
    { id: 'L3', label: 'Middle' },
    { id: 'L4', label: 'Ring' },
    { id: 'L5', label: 'Little' },
  ],
  right: [
    { id: 'R1', label: 'Thumb' },
    { id: 'R2', label: 'Index' },
    { id: 'R3', label: 'Middle' },
    { id: 'R4', label: 'Ring' },
    { id: 'R5', label: 'Little' },
  ],
};

export default function SAFingerprintViewPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, FingerprintData>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [studentRes, fpRes] = await Promise.all([
        studentAPI.get(studentId),
        fingerprintAPI.getAll(studentId),
      ]);
      if (studentRes.data.success) setStudent(studentRes.data.data);
      if (fpRes.data.success) setFingerprints(fpRes.data.data);
    } catch {
      toast.error('Failed to load data');
    }
  }, [studentId]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleDownload = () => {
    window.open(`${BACKEND_URL}/api/fingerprints/download/${studentId}`, '_blank');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const renderHand = (side: 'left' | 'right') => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">{side} Hand</h3>
      <div className="grid grid-cols-5 gap-2">
        {FINGER_POSITIONS[side].map((finger) => {
          const key = `${finger.id}_${side}`;
          const fp = fingerprints[key];
          const imgUrl = fp?.fileExists ? `${BACKEND_URL}/uploads/fingerprints/${fp.filename}` : null;

          return (
            <div key={finger.id} className="flex flex-col items-center">
              <button
                onClick={() => imgUrl && setSelectedImage(imgUrl)}
                className={`w-16 h-20 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden ${
                  fp ? 'border-green-400 bg-green-50 cursor-pointer hover:border-green-500' : 'border-gray-300 bg-gray-50 cursor-default'
                }`}
              >
                {imgUrl ? (
                  <img src={imgUrl} alt={finger.label} className="w-full h-full object-cover" />
                ) : fp ? (
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-gray-600 mt-1 text-center">{finger.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const totalFingerprints = Object.keys(fingerprints).length;

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <SuperAdminLayout user={user}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fingerprints</h1>
              {student && <p className="text-gray-600 mt-1">Student: {student.name}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{totalFingerprints}/10 recorded</span>
              <button onClick={handleDownload} disabled={totalFingerprints === 0}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Download All
              </button>
            </div>
          </div>

          {/* Hands */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderHand('left')}
            {renderHand('right')}
          </div>

          {/* Full-size Image Modal */}
          {selectedImage && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8"
              onClick={() => setSelectedImage(null)}>
              <div className="bg-white rounded-2xl p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900">Fingerprint Detail</h3>
                  <button onClick={() => setSelectedImage(null)}
                    className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <img src={selectedImage} alt="Fingerprint" className="w-full rounded-lg" />
              </div>
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}
