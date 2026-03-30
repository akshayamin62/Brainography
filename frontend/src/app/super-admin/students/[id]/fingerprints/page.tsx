'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { fingerprintAPI, studentAPI, analysisAPI, reportAPI, BACKEND_URL, withToken } from '@/lib/api';
import { Student, FingerprintData } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const SCANNER_URL = 'http://localhost:8585';

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

const PATTERNS = [
  'UL', 'RL', 'FL',
  'AS', 'AT', 'AU', 'AR',
  'WS', 'WT', 'WE', 'WD', 'WP', 'WI', 'WL', 'WC', 'WX',
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

export default function SAFingerprintPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, FingerprintData>>({});
  const [scannerStatus, setScannerStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [selectedHand, setSelectedHand] = useState<'right' | 'left'>('right');

  // Analysis state — pattern + ridge count per finger
  const [analysis, setAnalysis] = useState<Record<string, { pattern: string; ridgeCount: string }>>({});
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportData, setReportData] = useState<any>(null);

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
      const [studentRes, fpRes, analysisRes] = await Promise.all([
        studentAPI.get(studentId),
        fingerprintAPI.getAll(studentId),
        analysisAPI.get(studentId),
      ]);
      if (studentRes.data.success) setStudent(studentRes.data.data);
      if (fpRes.data.success) setFingerprints(fpRes.data.data);
      if (analysisRes.data.success && analysisRes.data.data) {
        const loaded: Record<string, { pattern: string; ridgeCount: string }> = {};
        for (const [pos, val] of Object.entries(analysisRes.data.data as Record<string, { pattern: string; ridgeCount: number }>)) {
          loaded[pos] = { pattern: val.pattern, ridgeCount: String(val.ridgeCount) };
        }
        setAnalysis(loaded);
      }
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

    if (scannerStatus === 'connected') {
      setTimeout(() => autoStartScan(position, angleKey), 300);
    }
  };

  const autoStartScan = async (position: string, angleKey: string) => {
    setScanning(true);
    setPreviewImage(null);
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

  // ── Analysis helpers ─────────────────────────────────────────
  const updateAnalysis = (fingerPos: string, field: 'pattern' | 'ridgeCount', value: string) => {
    setAnalysis(prev => {
      const current = prev[fingerPos] || { pattern: '', ridgeCount: '' };
      const updated = { ...current, [field]: value };
      // If pattern starts with 'A', force RC to 0
      if (field === 'pattern' && value.startsWith('A')) {
        updated.ridgeCount = '0';
      }
      return { ...prev, [fingerPos]: updated };
    });
  };

  const isAPattern = (fingerPos: string) => {
    const p = analysis[fingerPos]?.pattern || '';
    return p.startsWith('A');
  };

  const allFingersFilled = FINGERS.every(f => {
    const a = analysis[f.id];
    return a && a.pattern && a.ridgeCount !== '' && a.ridgeCount !== undefined;
  });

  const saveAnalysisData = async () => {
    setSavingAnalysis(true);
    try {
      const payload: Record<string, { pattern: string; ridgeCount: number }> = {};
      for (const f of FINGERS) {
        const a = analysis[f.id];
        if (a?.pattern && a?.ridgeCount !== '') {
          payload[f.id] = { pattern: a.pattern, ridgeCount: Number(a.ridgeCount) };
        }
      }
      const res = await analysisAPI.save(studentId, payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Analysis saved');
      }
    } catch {
      toast.error('Failed to save analysis');
    } finally {
      setSavingAnalysis(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!allFingersFilled) {
      toast.error('Please fill Pattern and RC for all 10 fingers before generating the report');
      return;
    }
    await saveAnalysisData();
    setGeneratingReport(true);
    try {
      const calcRes = await reportAPI.calculate(studentId);
      if (!calcRes.data.success) {
        toast.error(calcRes.data.message || 'Calculation failed');
        return;
      }
      setReportData(calcRes.data.data);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handlePrintReport = async () => {
    setDownloadingPdf(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const url = reportAPI.generateUrl(studentId);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        toast.error('Failed to generate PDF');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Brainography_Report_${student?.name || 'Student'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Report PDF downloaded!');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
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
      <SuperAdminLayout user={user}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fingerprints</h1>
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
              <span className="text-sm text-gray-500">{totalFingerprints}/30 recorded</span>
              <button onClick={handleDownload} disabled={totalFingerprints === 0}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Download All
              </button>
              <button onClick={saveAnalysisData} disabled={savingAnalysis}
                className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {savingAnalysis ? 'Saving...' : 'Save Analysis'}
              </button>
              <button onClick={handleGenerateReport} disabled={!allFingersFilled || generatingReport}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Hand toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedHand('right')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedHand === 'right' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Right Hand
            </button>
            <button
              onClick={() => setSelectedHand('left')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedHand === 'left' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Left Hand
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
                  <div className="flex items-center gap-4">
                    {/* Pattern */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pattern</span>
                      <select
                        value={analysis[finger.id]?.pattern || ''}
                        onChange={(e) => updateAnalysis(finger.id, 'pattern', e.target.value)}
                        className={`w-24 px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                          analysis[finger.id]?.pattern ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'
                        }`}
                      >
                        <option value="">--</option>
                        {PATTERNS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    {/* Ridges Count */}
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ridges Count</span>
                      <input
                        type="number"
                        min={0}
                        max={24}
                        value={analysis[finger.id]?.ridgeCount ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || (Number(v) >= 0 && Number(v) <= 24)) {
                            updateAnalysis(finger.id, 'ridgeCount', v);
                          }
                        }}
                        disabled={isAPattern(finger.id)}
                        placeholder="0"
                        className={`w-20 px-2 py-1.5 border rounded-lg text-lg font-bold text-center text-red-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                          isAPattern(finger.id) ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' :
                          analysis[finger.id]?.ridgeCount !== '' && analysis[finger.id]?.ridgeCount !== undefined
                            ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                    </div>
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
                            className="w-full aspect-[3/4] rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-green-400 transition-all overflow-hidden"
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
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
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

        {/* On-Screen Report Modal */}
        {reportData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Brainography Report — {student?.name}</h2>
                <div className="flex items-center gap-3">
                  <button onClick={handlePrintReport} disabled={downloadingPdf}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {downloadingPdf ? 'Downloading...' : 'Print Report (PDF)'}
                  </button>
                  <button onClick={() => setReportData(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6 space-y-6">
                {/* RC & Percentage Table */}
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Fingerprint Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Finger</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">Pattern</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">RC</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">Percentage</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">Strength</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {FINGERS.map(f => {
                          const rc = reportData.rcValues?.[f.id] ?? 0;
                          const pct = reportData.percentagesDisplay?.[f.id];
                          const pctStr = pct === 'X' ? 'X' : `${pct}%`;
                          const strength = pct === 'X' ? 'Open' : pct >= 9 ? 'Strong' : pct >= 8 ? 'Average' : 'Weak';
                          const strengthColor = pct === 'X' ? 'text-gray-500' : pct >= 9 ? 'text-green-600' : pct >= 8 ? 'text-yellow-600' : 'text-red-600';
                          return (
                            <tr key={f.id}>
                              <td className="px-3 py-2 font-medium text-gray-900">{FINGER_ALT_NAMES[f.id] || f.label}</td>
                              <td className="px-3 py-2 text-center font-mono text-sm">{reportData.patterns?.[f.id] || analysis[f.id]?.pattern || '-'}</td>
                              <td className="px-3 py-2 text-center">{rc}</td>
                              <td className="px-3 py-2 text-center font-semibold">{pctStr}</td>
                              <td className={`px-3 py-2 text-center font-medium ${strengthColor}`}>{strength}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-bold">
                          <td className="px-3 py-2">Total</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-center">{reportData.totalRc}</td>
                          <td className="px-3 py-2 text-center">100%</td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Brain Analysis */}
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Thinking Ability</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-sm font-medium text-blue-600 mb-1">Logic (Left Brain)</p>
                      <p className="text-2xl font-bold text-blue-800">{reportData.leftBrainResult}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                      <p className="text-sm font-medium text-purple-600 mb-1">Emotional (Right Brain)</p>
                      <p className="text-2xl font-bold text-purple-800">{reportData.rightBrainResult}</p>
                    </div>
                  </div>
                </section>

                {/* Achievement Styles */}
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Achievement Styles</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { key: 'follower', label: 'Follower', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                      { key: 'experimental', label: 'Experimental', color: 'bg-orange-50 border-orange-200 text-orange-800' },
                      { key: 'different', label: 'Different', color: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
                      { key: 'thoughtful', label: 'Thoughtful', color: 'bg-rose-50 border-rose-200 text-rose-800' },
                    ].map(s => (
                      <div key={s.key} className={`${s.color} border rounded-xl p-4 text-center`}>
                        <p className="text-sm font-medium mb-1">{s.label}</p>
                        <p className="text-2xl font-bold">{reportData.achievementStyles?.[s.key] || '0%'}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Learning & Communication Style */}
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Learning & Communication Style</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: 'kinResult', label: 'Kinesthetic', color: 'bg-amber-50 border-amber-200 text-amber-800' },
                      { key: 'audResult', label: 'Auditory', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
                      { key: 'visResult', label: 'Visual', color: 'bg-teal-50 border-teal-200 text-teal-800' },
                    ].map(s => (
                      <div key={s.key} className={`${s.color} border rounded-xl p-4 text-center`}>
                        <p className="text-sm font-medium mb-1">{s.label}</p>
                        <p className="text-2xl font-bold">{reportData[s.key] || '0'}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Work Ability Style */}
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Work Ability Style</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Ability</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">Result</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { key: 'iq', label: 'IQ (Intelligence)' },
                          { key: 'eq', label: 'EQ (Emotional)' },
                          { key: 'cq', label: 'CQ (Creativity)' },
                          { key: 'vq', label: 'VQ (Visionary)' },
                          { key: 'aq', label: 'AQ (Adversity)' },
                        ].map(q => {
                          const val = reportData.workAbilityResults?.[q.key] || '';
                          const numVal = parseFloat(val);
                          const desc = val.includes('X') ? 'Open' : isNaN(numVal) ? '-' : numVal >= 20 ? 'Strong' : numVal > 18 ? 'Above Average' : numVal >= 16 ? 'Average' : 'Developing';
                          const descColor = desc === 'Strong' ? 'text-green-600' : desc === 'Above Average' ? 'text-blue-600' : desc === 'Average' ? 'text-yellow-600' : desc === 'Open' ? 'text-gray-500' : 'text-red-600';
                          return (
                            <tr key={q.key}>
                              <td className="px-3 py-2 font-medium text-gray-900">{q.label}</td>
                              <td className="px-3 py-2 text-center font-semibold">{val}</td>
                              <td className={`px-3 py-2 text-center font-medium ${descColor}`}>{desc}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Personality Features */}
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Personality Type</h3>
                  {reportData.personalityFeatures && Object.keys(reportData.personalityFeatures).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(reportData.personalityFeatures as Record<string, Record<string, boolean>>).map(([type, features]) => (
                        <div key={type} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <p className="font-bold text-gray-800 mb-3 text-base">{type}</p>
                          <div className="flex flex-col gap-2">
                            {Object.entries(features).filter(([, v]) => v).map(([feat]) => (
                              <div key={feat} className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-800">{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No personality features matched.</p>
                  )}
                </section>

                {/* Career Recommendations */}
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Career Recommendations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                      <p className="font-bold text-green-800 mb-2">Highly Recommended</p>
                      {reportData.careerRecommendations?.highly_recommended?.length > 0 ? (
                        <ul className="space-y-1">
                          {reportData.careerRecommendations.highly_recommended.map((c: string, i: number) => (
                            <li key={i} className="text-sm text-green-900 flex items-start gap-1.5">
                              <span className="text-green-500 mt-0.5">&#8226;</span>{c}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-gray-500">None</p>}
                    </div>
                    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
                      <p className="font-bold text-blue-800 mb-2">Recommended</p>
                      {reportData.careerRecommendations?.recommended?.length > 0 ? (
                        <ul className="space-y-1">
                          {reportData.careerRecommendations.recommended.map((c: string, i: number) => (
                            <li key={i} className="text-sm text-blue-900 flex items-start gap-1.5">
                              <span className="text-blue-500 mt-0.5">&#8226;</span>{c}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-gray-500">None</p>}
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer with Print button */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setReportData(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Close
                </button>
                <button onClick={handlePrintReport} disabled={downloadingPdf}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {downloadingPdf ? 'Downloading...' : 'Print Report (PDF)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}
