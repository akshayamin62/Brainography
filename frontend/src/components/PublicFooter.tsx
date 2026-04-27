'use client';

import Link from 'next/link';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="col-span-1 md:col-span-2 animate-fade-in">
            <div className="mb-4 flex items-center group">
              <img
                src="/logo.png"
                alt="IMPACT Logo"
                className="h-16 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="max-w-md leading-relaxed text-gray-400">
              <b>IMPACT</b> is a structured assessment platform that helps students, parents,
              counselors, and institutions manage readiness, payments, and progress through a
              centralized ecosystem powered by ADMITra.
            </p>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 className="mb-4 text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="group flex items-center transition-all duration-300 hover:translate-x-1 hover:text-white">
                  <span className="mr-0 h-0.5 w-0 bg-blue-500 transition-all duration-300 group-hover:mr-2 group-hover:w-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link href="/login" className="group flex items-center transition-all duration-300 hover:translate-x-1 hover:text-white">
                  <span className="mr-0 h-0.5 w-0 bg-blue-500 transition-all duration-300 group-hover:mr-2 group-hover:w-4" />
                  Login
                </Link>
              </li>
              <li>
                <Link href="/scanner-download" className="group flex items-center transition-all duration-300 hover:translate-x-1 hover:text-white">
                  <span className="mr-0 h-0.5 w-0 bg-blue-500 transition-all duration-300 group-hover:mr-2 group-hover:w-4" />
                  Scanner Download
                </Link>
              </li>
              <li>
                <Link href="/legal-disclaimer" className="group flex items-center transition-all duration-300 hover:translate-x-1 hover:text-white">
                  <span className="mr-0 h-0.5 w-0 bg-blue-500 transition-all duration-300 group-hover:mr-2 group-hover:w-4" />
                  Legal Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="mb-4 text-lg font-semibold text-white">Support</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <div className="text-sm leading-relaxed">+91 7046673033</div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <a href="mailto:hello@admitra.io" className="text-sm transition-colors hover:text-white">hello@admitra.io</a>
              </li>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-sm leading-relaxed">
                  Mon - Sat: <strong className="text-gray-300">10:00 – 19:30</strong><br />
                  Sun: <strong className="text-gray-300">On Request</strong>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800/50 pt-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-gray-400">
              ©{currentYear} All Rights Reserved by <strong className="text-white">ADMITra</strong>
            </p>
            <div className="mt-4 flex space-x-6 md:mt-0">
              <Link href="/privacy" className="text-sm text-gray-400 transition-all duration-300 hover:text-white hover:underline hover:underline-offset-4">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 transition-all duration-300 hover:text-white hover:underline hover:underline-offset-4">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-sm text-gray-400 transition-all duration-300 hover:text-white hover:underline hover:underline-offset-4">
                Cookie Policy
              </Link>
              <Link href="/refund-policy" className="text-sm text-gray-400 transition-all duration-300 hover:text-white hover:underline hover:underline-offset-4">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
