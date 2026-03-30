'use client';

import { useEffect, useState } from 'react';

type OS = 'windows' | 'mac' | 'other' | null;

function detectOS(): OS {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Win/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  return 'other';
}

const WINDOWS_FILE = '/downloads/BrainographyScanner_Setup.exe';
const MAC_FILE = '/downloads/BrainographyScanner.dmg';

export default function ScannerDownloadPage() {
  const [os, setOS] = useState<OS>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [manualOS, setManualOS] = useState<'windows' | 'mac' | null>(null);
  const [available, setAvailable] = useState<{ windows: boolean | null; mac: boolean | null }>({ windows: null, mac: null });

  function triggerDownload(file: string) {
    const link = document.createElement('a');
    link.href = file;
    link.download = file.split('/').pop()!;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  useEffect(() => {
    const detected = detectOS();
    setOS(detected);
    // Check file availability before auto-downloading
    Promise.all([
      fetch(WINDOWS_FILE, { method: 'HEAD' }).then(r => r.ok).catch(() => false),
      fetch(MAC_FILE, { method: 'HEAD' }).then(r => r.ok).catch(() => false),
    ]).then(([winOk, macOk]) => {
      setAvailable({ windows: winOk, mac: macOk });
      if (detected === 'windows' && winOk) { triggerDownload(WINDOWS_FILE); setDownloaded(true); }
      else if (detected === 'mac' && macOk) { triggerDownload(MAC_FILE); setDownloaded(true); }
    });
  }, []);

  const active = manualOS ?? (os === 'windows' || os === 'mac' ? os : null);

  const handleManualDownload = (target: 'windows' | 'mac') => {
    setManualOS(target);
    if (!available[target]) return;
    triggerDownload(target === 'windows' ? WINDOWS_FILE : MAC_FILE);
    setDownloaded(true);
  };

  const steps = {
    windows: [
      { n: 1, text: 'Double-click BrainographyScanner_Setup.exe' },
      { n: 2, text: 'Click "Next" through the setup wizard' },
      { n: 3, text: 'Click "Install" — it copies files and auto-configures' },
      { n: 4, text: 'Click "Finish" — a green 🟢 icon appears in your taskbar (bottom-right)' },
      { n: 5, text: 'Plug in your Futronic USB scanner — you\'re done!' },
    ],
    mac: [
      { n: 1, text: 'Open BrainographyScanner.dmg' },
      { n: 2, text: 'Double-click Install.command inside the DMG' },
      { n: 3, text: 'Enter your Mac password when prompted' },
      { n: 4, text: 'The service starts silently in the background' },
      { n: 5, text: 'Plug in your Futronic USB scanner — you\'re done!' },
    ],
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center px-4 py-10">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-3">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6a6 6 0 0 1 5.5 3M8.5 22c.7-2.3 1-4.5 1-7 0-2.2.8-4 3-4.5M14 13c0 2-.5 4-1.5 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Brainography Scanner</h1>
        <p className="text-gray-500 mt-1 text-sm">Connect your Futronic fingerprint scanner to the Brainography platform</p>
      </div>

      {/* Auto-detect banner */}
      {os && os !== 'other' && downloaded && (
        <div className="w-full max-w-lg mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-800">
            <strong>{os === 'windows' ? 'Windows' : 'Mac'} detected</strong> — your download has started automatically.
            If it didn&apos;t start, click the button below.
          </p>
        </div>
      )}

      {os && os !== 'other' && available[os] === false && (
        <div className="w-full max-w-lg mb-6 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-orange-800">
            <strong>{os === 'windows' ? 'Windows' : 'Mac'} installer not yet available.</strong> The download will be enabled once the installer is built and uploaded.
          </p>
        </div>
      )}

      {os === 'other' && (
        <div className="w-full max-w-lg mb-6 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-yellow-800">
            Your operating system was not detected. Please choose your platform below.
          </p>
        </div>
      )}

      {/* Download cards */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-4 mb-8">
        {/* Windows card */}
        <button
          onClick={() => handleManualDownload('windows')}
          disabled={available.windows === false}
          className={`group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-left
            ${available.windows === false
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              : active === 'windows'
                ? 'cursor-pointer border-blue-500 bg-blue-50 shadow-md'
                : 'cursor-pointer border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'}`}
        >
          {active === 'windows' && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {/* Windows logo */}
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
            <path d="M3 5.5L11 4v7.5H3V5.5z" fill="#0078D4" />
            <path d="M11 12H3v6.5L11 20V12z" fill="#0078D4" />
            <path d="M12 3.75L21 2.5V11.5H12V3.75z" fill="#0078D4" />
            <path d="M12 12H21v9L12 19.75V12z" fill="#0078D4" />
          </svg>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Windows</p>
            <p className="text-xs text-gray-400 mt-0.5">.exe installer</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </div>
        </button>

        {/* Mac card */}
        <button
          onClick={() => handleManualDownload('mac')}
          disabled={available.mac === false}
          className={`group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-left
            ${available.mac === false
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              : active === 'mac'
                ? 'cursor-pointer border-blue-500 bg-blue-50 shadow-md'
                : 'cursor-pointer border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'}`}
        >
          {active === 'mac' && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {/* Apple logo */}
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#1d1d1f">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Mac</p>
            <p className="text-xs text-gray-400 mt-0.5">.pkg installer</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </div>
        </button>
      </div>

      {/* Installation steps */}
      {active && (
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Installation steps — {active === 'windows' ? 'Windows' : 'Mac'}
          </h2>
          <ol className="space-y-3">
            {steps[active].map(({ n, text }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {n}
                </span>
                <span className="text-sm text-gray-700">{text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Compatibility note */}
      <div className="w-full max-w-lg rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 flex items-start gap-3">
        <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong className="text-gray-700">Windows:</strong> Windows 7 / 8 / 10 / 11 (32-bit &amp; 64-bit). No Python required.</p>
          <p><strong className="text-gray-700">Mac:</strong> macOS 10.15 Catalina or higher. No Python required.</p>
          <p className="pt-1 text-gray-400">The service runs on <code className="bg-gray-100 px-1 rounded">localhost:8585</code> and communicates with the Brainography web app.</p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400">&copy; {new Date().getFullYear()} Brainography. All rights reserved.</p>
    </div>
  );
}
