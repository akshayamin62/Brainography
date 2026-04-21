'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { paymentAPI } from '@/lib/api';

function PaymentVerifyContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'paid' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const params = searchParams.toString();
        const res = await paymentAPI.verifyPayment(params);
        if (res.data.success && res.data.data?.status === 'paid') {
          setStatus('paid');
          setMessage('Your payment has been successfully completed!');
        } else {
          setStatus(res.data.data?.status === 'pending' ? 'pending' : 'failed');
          setMessage(res.data.message || 'Payment verification is pending.');
        }
      } catch {
        setStatus('failed');
        setMessage('Unable to verify payment. Please contact support.');
      }
    };
    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brainography</h1>
          <p className="text-gray-500">Payment Verification</p>
        </div>

        {status === 'loading' && (
          <div className="py-8">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your payment...</p>
          </div>
        )}

        {status === 'paid' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-400 mt-4">You can close this window now.</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-yellow-700 mb-2">Payment Pending</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Payment Failed</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    }>
      <PaymentVerifyContent />
    </Suspense>
  );
}
