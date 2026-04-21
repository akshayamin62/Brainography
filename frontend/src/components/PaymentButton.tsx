'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { paymentAPI } from '@/lib/api';
import { PaymentStatus } from '@/types';
import toast from 'react-hot-toast';

interface PaymentButtonProps {
  studentId: string;
  studentName: string;
}

export default function PaymentButton({ studentId, studentName }: PaymentButtonProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await paymentAPI.getStatus(studentId);
      if (res.data.success) {
        setPaymentStatus(res.data.data);
        if (res.data.data.isPending && res.data.data.remainingSeconds > 0) {
          setCountdown(res.data.data.remainingSeconds);
        } else {
          setCountdown(0);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Refetch status when countdown reaches 0
            fetchStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown, fetchStatus]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await paymentAPI.generateLink(studentId);
      if (res.data.success) {
        toast.success(`Payment link sent to ${studentName}'s email!`);
        await fetchStatus();
      } else {
        toast.error(res.data.message || 'Failed to generate payment link');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to generate payment link';
      toast.error(msg);
      // If there's remaining time info in the error, refetch
      if (err.response?.data?.data?.remainingSeconds) {
        setCountdown(err.response.data.data.remainingSeconds);
        setPaymentStatus((prev) => prev ? { ...prev, canGenerateLink: false, isPending: true } : prev);
      }
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs text-gray-400">
        <svg className="w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </span>
    );
  }

  // Payment already completed
  if (paymentStatus?.status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium" title={`Paid${paymentStatus.paidAt ? ' on ' + new Date(paymentStatus.paidAt).toLocaleString() : ''}`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Paid
      </span>
    );
  }

  // Payment link is pending (active, not expired)
  if (paymentStatus?.isPending && countdown > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium" title={`Link active. Initiated by ${typeof paymentStatus.initiatedBy === 'object' ? paymentStatus.initiatedBy.name : 'Unknown'}`}>
        <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatTime(countdown)}
      </span>
    );
  }

  // Can generate link
  if (paymentStatus?.canGenerateLink !== false) {
    return (
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        title="Send payment link to student's email"
      >
        {generating ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
        {generating ? 'Sending...' : 'Pay Link'}
      </button>
    );
  }

  // Default fallback (expired/failed but timer hasn't refetched yet)
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Expired
    </span>
  );
}
