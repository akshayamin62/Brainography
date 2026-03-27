'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

// Generate random captcha
const generateCaptcha = (length: number = 6): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ2345689';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Hash captcha using SHA-256
const hashCaptcha = async (captcha: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(captcha.toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);

  // Generate and store hashed captcha in localStorage on mount
  useEffect(() => {
    if (step === 'request') {
      const initCaptcha = async () => {
        const newCaptcha = generateCaptcha();
        setCaptcha(newCaptcha);
        const hashed = await hashCaptcha(newCaptcha);
        localStorage.setItem('login_captcha', hashed);
      };
      initCaptcha();
    }
  }, [step]);

  const handleRegenerateCaptcha = async () => {
    const newCaptcha = generateCaptcha();
    setCaptcha(newCaptcha);
    const hashed = await hashCaptcha(newCaptcha);
    localStorage.setItem('login_captcha', hashed);
    setCaptchaInput('');
    toast.success('Captcha regenerated!');
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    const storedCaptchaHash = localStorage.getItem('login_captcha');
    if (!storedCaptchaHash || !captcha) {
      toast.error('Please wait for captcha to load');
      return;
    }

    if (!captchaInput) {
      toast.error('Please enter the captcha');
      return;
    }

    setLoading(true);

    try {
      const captchaInputHash = await hashCaptcha(captchaInput);
      const response = await authAPI.login({
        email,
        captcha: storedCaptchaHash,
        captchaInput: captchaInputHash,
      });
      const message = response.data.message || 'OTP sent to your email!';
      toast.success(message, { duration: 4000 });
      localStorage.removeItem('login_captcha');
      setStep('verify');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      toast.error(message);
      handleRegenerateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.verifyOTP({ email, otp });
      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tokenExpiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      
      toast.success('Login successful!');
      
      setTimeout(() => {
        if (user.role === 'SUPER_ADMIN') {
          router.push('/super-admin/dashboard');
        } else if (user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }, 1000);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Brainography" className="h-20 w-auto object-contain" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 animate-scale-in">
          {step === 'request' ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Captcha Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Captcha
                </label>
                <div className="space-y-3">
                  {captcha ? (
                    <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 border-2 border-gray-500 rounded-xl p-1 relative overflow-hidden">
                      {/* Background noise patterns */}
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,.08) 8px, rgba(0,0,0,.08) 16px), repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,.05) 8px, rgba(0,0,0,.05) 16px)',
                      }}></div>
                      {/* Random dots */}
                      <div className="absolute inset-0">
                        {[...Array(30)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute rounded-full bg-gray-600 opacity-20"
                            style={{
                              width: `${Math.random() * 3 + 1}px`,
                              height: `${Math.random() * 3 + 1}px`,
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                      {/* Random lines */}
                      <div className="absolute inset-0">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute bg-gray-500 opacity-15"
                            style={{
                              width: '100%',
                              height: '1px',
                              top: `${Math.random() * 100}%`,
                              transform: `rotate(${Math.random() * 20 - 10}deg)`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-center relative">
                        <span
                          className="text-3xl font-bold text-gray-800 select-none"
                          style={{
                            fontFamily: 'monospace',
                            letterSpacing: '0.6em',
                            textShadow: '3px 3px 5px rgba(0,0,0,0.2), -2px -2px 3px rgba(255,255,255,0.7), 1px -1px 2px rgba(0,0,0,0.1)',
                            transform: 'skewX(-8deg)',
                            filter: 'blur(0.3px)',
                          }}
                        >
                          {captcha.split('').map((char, index) => (
                            <span
                              key={index}
                              style={{
                                display: 'inline-block',
                                transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (Math.random() * 15 + 8)}deg) translateY(${(index % 2 === 0 ? 1 : -1) * 3}px) scaleX(${0.9 + Math.random() * 0.3})`,
                                fontSize: `${0.85 + Math.random() * 0.3}em`,
                                color: `rgb(${50 + Math.random() * 100}, ${50 + Math.random() * 100}, ${50 + Math.random() * 100})`,
                                textShadow: `${Math.random() * 2}px ${Math.random() * 2}px 3px rgba(0,0,0,0.3)`,
                              }}
                            >
                              {char}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Captcha Input */}
                  {captcha && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 uppercase tracking-widest text-center font-semibold"
                        placeholder="Enter captcha"
                      />
                    </div>
                  )}

                  {/* Regenerate Button */}
                  {captcha && (
                    <button
                      type="button"
                      onClick={handleRegenerateCaptcha}
                      className="w-full py-2 px-4 bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate Captcha
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-glow"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center mb-4">
                <div className="inline-block p-3 bg-linear-to-br from-green-600 to-emerald-600 rounded-2xl shadow-xl mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enter OTP</h3>
                <p className="text-gray-600">
                  We sent a 6-digit code to <span className="font-semibold">{email}</span>
                </p>
              </div>

              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-center text-2xl font-bold tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Check your email for the 6-digit code</p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-glow"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify & Login'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setOtp('');
                  setCaptcha('');
                  setCaptchaInput('');
                  localStorage.removeItem('login_captcha');
                }}
                className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 font-medium rounded-xl transition-colors"
              >
                ← Back to Email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
