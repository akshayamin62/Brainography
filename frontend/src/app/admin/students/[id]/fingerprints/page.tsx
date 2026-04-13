'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { fingerprintAPI, studentAPI, BACKEND_URL, withToken } from '@/lib/api';
import { Student, FingerprintData } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const SCANNER_URL = process.env.NEXT_PUBLIC_SCANNER_URL || 'http://localhost:8585';

const FINGERS = [
  { id: 'R1', label: 'Right Thumb' },
  { id: 'R2', label: 'Right Index' },
  { id: 'R3', label: 'Right Middle' },
  { id: 'R4', label: 'Right Ring' },
  { id: 'R5', label: 'Right Little' },
  { id: 'L1', label: 'Left Thumb' },
  { id: 'L2', label: 'Left Index' },
  { id: 'L3', label: 'Left Middle' },
  { id: 'L4', label: 'Left Ring' },
  { id: 'L5', label: 'Left Little' },
];

const ANGLES = [
  { key: 'middle', label: 'Center' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

const FINGER_ALT_NAMES: Record<string, string> = {
  'L1': 'Execution',
  'L2': 'Aesthetic',
  'L3': 'Movement',
  'L4': 'Articulation',
  'L5': 'Ecological',
  'R1': 'Strategy',
  'R2': 'Intellect',
  'R3': 'Balance',
  'R4': 'Expression',
  'R5': 'Observation',
};

export default function FingerprintScanPage() {
  const { user, loading } = useAuth('ADMIN');
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, FingerprintData>>({});
  const [scannerStatus, setScannerStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [selectedHand, setSelectedHand] = useState<'right' | 'left'>('right');

  // Modal state
  const [scanModal, setScanModal] = useState<{ position: string; angle: string; label: string } | null>(null);
  const [viewModal, setViewModal] = useState<{ label: string; imgUrl: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const checkScanner = async () => {
      try {
        const res = await fetch(`${SCANNER_URL}/scanner/status`);
        const data = await res.json();
        setScannerStatus(data.success ? 'connected' : 'disconnected');
      } catch {
        setScannerStatus('disconnected');
      }
    };
    checkScanner();
    const interval = setInterval(checkScanner, 5000);
    return () => clearInterval(interval);
  }, []);

  const openScanModal = async (position: string, angleKey: string, label: string) => {
    setScanModal({ position, angle: angleKey, label });
    setPreviewImage(null);
    setScanning(false);

    // Auto-start scanning if scanner is connected
    if (scannerStatus === 'connected') {
      setTimeout(() => autoStartScan(position, angleKey), 300);
    }
  };

  const autoStartScan = async (position: string, angleKey: string) => {
    setScanning(true);
    setPreviewImage(null);
    // BUG-005: Clear existing interval before starting new one
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    try {
      await fetch(`${SCANNER_URL}/scanner/start_preview`, { method: 'POST' });
      const intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${SCANNER_URL}/scanner/get_preview`);
          const data = await res.json();
          if (data.success && data.image) {
            setPreviewImage(`data:image/png;base64,${data.image}`);
          }
        } catch { /* ignore */ }
      }, 200);
      scanIntervalRef.current = intervalId;
    } catch {
      toast.error('Failed to start scan');
      setScanning(false);
    }
  };

  const captureFingerprint = async () => {
    if (!scanModal) return;
    try {
      await fetch(`${SCANNER_URL}/scanner/stop_preview`, { method: 'POST' });
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;

      const res = await fetch(`${SCANNER_URL}/scanner/capture`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.image) {
        setPreviewImage(`data:image/png;base64,${data.image}`);
        setScanning(false);
        setUploading(true);
        const uploadRes = await fingerprintAPI.upload({
          studentId,
          fingerPosition: scanModal.position,
          fingerType: scanModal.angle,
          imageData: data.image,
        });
        if (uploadRes.data.success) {
          toast.success('Fingerprint captured and saved!');
          fetchData();
          closeScanModal();
          return; // Exit early so finally doesn't update already-cleaned state
        }
      } else {
        toast.error(data.message || 'Failed to capture');
      }
    } catch {
      toast.error('Capture failed');
    } finally {
      // BUG-006: Only update state if modal is still open
      if (scanModal) {
        setUploading(false);
        setScanning(false);
      }
    }
  };

  const closeScanModal = () => {
    try {
      fetch(`${SCANNER_URL}/scanner/stop_preview`, { method: 'POST' }).catch(() => {});
    } catch { /* ignore */ }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = null;
    setScanModal(null);
    setPreviewImage(null);
    setScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!scanModal || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setPreviewImage(reader.result as string);
      setUploading(true);
      try {
        const res = await fingerprintAPI.upload({
          studentId,
          fingerPosition: scanModal.position,
          fingerType: scanModal.angle,
          imageData: base64,
        });
        if (res.data.success) {
          toast.success('Fingerprint uploaded!');
          fetchData();
          closeScanModal();
        }
      } catch {
        toast.error('Upload failed');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownload = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${BACKEND_URL}/api/fingerprints/download/${studentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        toast.error('Failed to download fingerprints');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${student?.name || 'Student'}_fingerprints.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Fingerprints downloaded!');
    } catch {
      toast.error('Failed to download fingerprints');
    }
  };

  const initScanner = async () => {
    try {
      const res = await fetch(`${SCANNER_URL}/scanner/init`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Scanner initialized');
        setScannerStatus('connected');
      } else {
        toast.error(data.message || 'Failed to initialize scanner');
      }
    } catch {
      toast.error('Cannot connect to scanner service');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const totalFingerprints = Object.keys(fingerprints).length;

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <AdminLayout user={user}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fingerprint Scan</h1>
              {student && <p className="text-gray-600 mt-1">Student: {student.name}</p>}
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                scannerStatus === 'connected' ? 'bg-green-100 text-green-700' :
                scannerStatus === 'disconnected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  scannerStatus === 'connected' ? 'bg-green-500' :
                  scannerStatus === 'disconnected' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                Scanner: {scannerStatus}
              </div>
              {scannerStatus !== 'connected' && (
                <button onClick={initScanner}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  Initialize
                </button>
              )}
              <span className="text-sm text-gray-500">{totalFingerprints}/30</span>
              <button onClick={handleDownload}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                Download All
              </button>
            </div>
          </div>

          {/* Hand toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedHand('left')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedHand === 'left' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Left Hand
            </button>
            <button
              onClick={() => setSelectedHand('right')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedHand === 'right' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Right Hand
            </button>
          </div>

          {/* Finger cards */}
          <div className="space-y-6">
            {FINGERS.filter(f => selectedHand === 'right' ? f.id.startsWith('R') : f.id.startsWith('L')).map((finger) => (
              <div key={finger.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                {/* Card header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6a6 6 0 0 1 5.5 3M8.5 22c.7-2.3 1-4.5 1-7 0-2.2.8-4 3-4.5M14 13c0 2-.5 4-1.5 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{finger.label}</h3>
                  </div>
                </div>
                {/* Three views */}
                <div className="grid grid-cols-3 gap-4">
                  {ANGLES.map((angle) => {
                    const key = `${finger.id}_${angle.key}`;
                    const fp = fingerprints[key];
                    const imgUrl = fp?.fileExists ? withToken(`${BACKEND_URL}/uploads/fingerprints/${fp.filename}`) : null;
                    return (
                      <div key={angle.key} className="flex flex-col items-center">
                        {imgUrl ? (
                          <button
                            onClick={() => setViewModal({ label: `${finger.label} - ${angle.label}`, imgUrl })}
                            className="w-full aspect-[3/4] rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-blue-400 transition-all overflow-hidden"
                            title={`View ${finger.label} ${angle.label}`}
                          >
                            <img src={imgUrl} alt={`${finger.label} ${angle.label}`} className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                            </svg>
                          </div>
                        )}
                        <p className="mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{angle.label} View</p>
                        <button
                          onClick={() => openScanModal(finger.id, angle.key, `${finger.label} - ${angle.label}`)}
                          className="mt-1 text-lg font-medium text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          {fp ? 'Scan Again' : 'Scan'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Modal with Zoom */}
        {viewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setViewModal(null); setZoomLevel(1); }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{viewModal.label}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold">-</button>
                  <span className="text-sm text-gray-500 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold">+</button>
                  <button onClick={() => setZoomLevel(1)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">Reset</button>
                  <button onClick={() => { setViewModal(null); setZoomLevel(1); }} className="text-gray-400 hover:text-gray-600 ml-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="w-full flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 overflow-auto" style={{ minHeight: '320px', maxHeight: '70vh' }}>
                <img src={viewModal.imgUrl} alt={viewModal.label} className="transition-transform duration-200" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }} />
              </div>
            </div>
          </div>
        )}

        {/* Scan Modal */}
        {scanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{scanModal.label}</h3>
                <button onClick={closeScanModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="w-full h-64 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-4">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                ) : scanning ? (
                  <div className="text-center text-gray-400">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-2" />
                    <p className="text-sm">Scanning...</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                    <p className="text-sm">Place finger on scanner</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {scanning ? (
                  <>
                    <button onClick={captureFingerprint} disabled={uploading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                      {uploading ? 'Saving...' : 'Capture'}
                    </button>
                    <button onClick={closeScanModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {scannerStatus === 'connected' ? (
                      <button onClick={() => autoStartScan(scanModal.position, scanModal.angle)}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">
                        Start Scan
                      </button>
                    ) : (
                      <button onClick={initScanner}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                        Initialize Scanner
                      </button>
                    )}
                    <label className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm text-center cursor-pointer">
                      {uploading ? 'Uploading...' : 'Upload File'}
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                    </label>
                    <button onClick={closeScanModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
