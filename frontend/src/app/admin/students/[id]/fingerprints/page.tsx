'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { fingerprintAPI, studentAPI, BACKEND_URL } from '@/lib/api';
import { Student, FingerprintData } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const SCANNER_URL = 'http://localhost:8585';

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

export default function FingerprintScanPage() {
  const { user, loading } = useAuth('ADMIN');
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, FingerprintData>>({});
  const [selectedFinger, setSelectedFinger] = useState<{ position: string; type: string } | null>(null);
  const [scannerStatus, setScannerStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // Check scanner status
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

  // Initialize scanner
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
      toast.error('Cannot connect to scanner service. Make sure local_scanner_service.py is running on port 8585.');
    }
  };

  // Start scanning with live preview
  const startScan = async () => {
    if (!selectedFinger) {
      toast.error('Please select a finger position first');
      return;
    }
    setScanning(true);
    setPreviewImage(null);

    try {
      // Start preview
      await fetch(`${SCANNER_URL}/scanner/start_preview`, { method: 'POST' });

      // Poll for preview frames
      const pollPreview = async () => {
        if (!scanning) return;
        try {
          const res = await fetch(`${SCANNER_URL}/scanner/get_preview`);
          const data = await res.json();
          if (data.success && data.image) {
            setPreviewImage(`data:image/png;base64,${data.image}`);
          }
        } catch { /* ignore */ }
      };

      const intervalId = setInterval(pollPreview, 200);

      // Store interval for cleanup
      (window as any).__scanInterval = intervalId;
    } catch {
      toast.error('Failed to start scan');
      setScanning(false);
    }
  };

  // Capture fingerprint from scanner
  const captureFingerprint = async () => {
    if (!selectedFinger) return;

    try {
      // Stop preview first
      await fetch(`${SCANNER_URL}/scanner/stop_preview`, { method: 'POST' });
      if ((window as any).__scanInterval) {
        clearInterval((window as any).__scanInterval);
      }

      // Capture frame
      const res = await fetch(`${SCANNER_URL}/scanner/capture`, { method: 'POST' });
      const data = await res.json();

      if (data.success && data.image) {
        setPreviewImage(`data:image/png;base64,${data.image}`);
        setScanning(false);

        // Upload to backend
        setUploading(true);
        const uploadRes = await fingerprintAPI.upload({
          studentId,
          fingerPosition: selectedFinger.position,
          fingerType: selectedFinger.type,
          imageData: data.image,
        });

        if (uploadRes.data.success) {
          toast.success('Fingerprint captured and saved!');
          fetchData();
        }
      } else {
        toast.error(data.message || 'Failed to capture');
      }
    } catch {
      toast.error('Capture failed');
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

  // Stop scanning
  const stopScan = async () => {
    try {
      await fetch(`${SCANNER_URL}/scanner/stop_preview`, { method: 'POST' });
    } catch { /* ignore */ }
    if ((window as any).__scanInterval) {
      clearInterval((window as any).__scanInterval);
    }
    setScanning(false);
  };

  // Manual file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFinger || !e.target.files?.[0]) return;
    const file = e.target.files[0];

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setPreviewImage(reader.result as string);
      setUploading(true);

      try {
        const res = await fingerprintAPI.upload({
          studentId,
          fingerPosition: selectedFinger.position,
          fingerType: selectedFinger.type,
          imageData: base64,
        });
        if (res.data.success) {
          toast.success('Fingerprint uploaded!');
          fetchData();
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

  // Delete fingerprint
  const handleDelete = async (fpId: string) => {
    if (!confirm('Delete this fingerprint?')) return;
    try {
      const res = await fingerprintAPI.delete(fpId);
      if (res.data.success) {
        toast.success('Deleted');
        fetchData();
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  // Download all
  const handleDownload = () => {
    const token = localStorage.getItem('token');
    const url = `${BACKEND_URL}/api/fingerprints/download/${studentId}`;
    // Open in new tab with auth
    window.open(url, '_blank');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
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
          const isSelected = selectedFinger?.position === finger.id && selectedFinger?.type === side;

          return (
            <div key={finger.id} className="flex flex-col items-center">
              <button
                onClick={() => setSelectedFinger({ position: finger.id, type: side })}
                className={`w-16 h-20 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-200 shadow-lg'
                    : fp
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                }`}
              >
                {fp?.fileExists ? (
                  <img
                    src={`${BACKEND_URL}/uploads/fingerprints/${fp.filename}`}
                    alt={finger.label}
                    className="w-full h-full object-cover"
                  />
                ) : fp ? (
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-gray-600 mt-1 text-center">{finger.label}</span>
              {fp && (
                <button onClick={() => handleDelete(fp.id)}
                  className="text-xs text-red-500 hover:text-red-700 mt-0.5">
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <AdminLayout user={user}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fingerprint Scan</h1>
              {student && <p className="text-gray-600 mt-1">Student: {student.name}</p>}
            </div>
            <div className="flex items-center gap-3">
              {/* Scanner Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                scannerStatus === 'connected' ? 'bg-green-100 text-green-700' :
                scannerStatus === 'disconnected' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  scannerStatus === 'connected' ? 'bg-green-500' :
                  scannerStatus === 'disconnected' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
                Scanner: {scannerStatus}
              </div>

              <button onClick={handleDownload}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                Download All
              </button>
            </div>
          </div>

          {/* Hands Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {renderHand('left')}
            {renderHand('right')}
          </div>

          {/* Scan Controls */}
          {selectedFinger && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected: {selectedFinger.type.charAt(0).toUpperCase() + selectedFinger.type.slice(1)} Hand - {selectedFinger.position}
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Preview Area */}
                <div className="flex flex-col items-center">
                  <div className="w-64 h-80 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                        </svg>
                        <p className="text-sm">Fingerprint Preview</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-4">
                  {/* Scanner Controls */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Futronics Scanner
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {scannerStatus !== 'connected' && (
                        <button onClick={initScanner}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                          Initialize Scanner
                        </button>
                      )}
                      {!scanning ? (
                        <button onClick={startScan} disabled={scannerStatus !== 'connected'}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
                          Start Scan
                        </button>
                      ) : (
                        <>
                          <button onClick={captureFingerprint}
                            className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors animate-pulse">
                            Capture
                          </button>
                          <button onClick={stopScan}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                            Stop
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Manual Upload */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Manual Upload
                    </h4>
                    <label className="block">
                      <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm cursor-pointer hover:bg-gray-300 transition-colors inline-block">
                        {uploading ? 'Uploading...' : 'Choose Image File'}
                      </span>
                      <input type="file" accept="image/*" onChange={handleFileUpload}
                        disabled={uploading} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Supported: PNG, JPG, BMP, TIFF</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
