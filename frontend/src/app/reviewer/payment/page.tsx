'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { paymentAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import PublicFooter from '@/components/PublicFooter';

const REVIEWER_EMAIL = 'reviewer@admitra.io';

function ReviewerPageLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50">
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
      <PublicFooter />
    </div>
  );
}

function ReviewerPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth('REVIEWER');
  const [creatingLink, setCreatingLink] = useState(false);

  const paymentStatus = useMemo(() => searchParams.get('razorpay_payment_link_status'), [searchParams]);

  const statusCard = useMemo(() => {
    if (paymentStatus === 'paid') {
      return {
        title: 'Payment Successful',
        description: 'Thank you. The reviewer payment was completed successfully.',
        className: 'bg-green-50 border-green-200 text-green-800',
      };
    }
    if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      return {
        title: 'Payment Incomplete',
        description: 'The payment was not completed. You can click the button below to try again.',
        className: 'bg-red-50 border-red-200 text-red-800',
      };
    }
    return null;
  }, [paymentStatus]);

  const handleMakePayment = async () => {
    setCreatingLink(true);
    try {
      const res = await paymentAPI.createReviewerLink();
      const paymentUrl = res.data?.data?.paymentUrl;
      if (!paymentUrl) {
        throw new Error('Payment link was not returned');
      }
      window.location.href = paymentUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to open payment gateway.');
    } finally {
      setCreatingLink(false);
    }
  };

  if (loading) {
    return <ReviewerPageLoading />;
  }

  if (!user) {
    return null;
  }

  if (user.email.toLowerCase() !== REVIEWER_EMAIL) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50">
      <Toaster position="top-right" />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <main className="relative z-10 mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl animate-scale-in">
            <div className="mb-8 text-center">
              <div className="mb-4 flex justify-center">
                <img src="/logo.png" alt="Brainography" className="h-20 w-auto object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Reviewer Payment</h1>
              <p className="mt-2 text-gray-600">Click below to open the Razorpay payment gateway.</p>
            </div>

            {statusCard && (
              <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${statusCard.className}`}>
                <p className="font-semibold">{statusCard.title}</p>
                <p className="mt-1">{statusCard.description}</p>
              </div>
            )}

            <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Logged in as</p>
              <p className="mt-1 break-all">{user.email}</p>
            </div>

            <button
              type="button"
              onClick={handleMakePayment}
              disabled={creatingLink}
              className="mt-6 w-full rounded-xl bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingLink ? 'Opening Payment Gateway...' : 'Make Payment'}
            </button>
          </div>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}

export default function ReviewerPaymentPage() {
  return (
    <Suspense fallback={<ReviewerPageLoading />}>
      <ReviewerPaymentContent />
    </Suspense>
  );
}
