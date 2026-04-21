'use client';

import { useEffect, useState } from 'react';
import CounselorLayout from '@/components/CounselorLayout';
import { useAuth } from '@/hooks/useAuth';
import { paymentAPI } from '@/lib/api';
import { PaymentLog } from '@/types';
import toast from 'react-hot-toast';

export default function CounselorPaymentHistoryPage() {
  const { user, loading } = useAuth('COUNSELOR');
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    paymentAPI.getAllLogs()
      .then((res) => setPayments(res.data.data || []))
      .catch(() => toast.error('Failed to load payment history'))
      .finally(() => setFetching(false));
  }, [user]);

  const handleDownload = async (paymentId: string) => {
    try {
      const res = await paymentAPI.downloadInvoice(paymentId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${paymentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const getStudentName = (p: PaymentLog) => {
    if (typeof p.studentId === 'object') {
      return p.studentId.name || `${(p.studentId as any).firstName || ''} ${(p.studentId as any).lastName || ''}`.trim();
    }
    return p.studentId;
  };

  const getStudentEmail = (p: PaymentLog) => {
    if (typeof p.studentId === 'object') return p.studentId.email || '-';
    return '-';
  };

  const getInitiatedBy = (p: PaymentLog) => {
    if (typeof p.initiatedBy === 'object') return (p.initiatedBy as any).name || (p.initiatedBy as any).email || '-';
    return p.initiatedBy || '-';
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <CounselorLayout user={user}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h1>

        {payments.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No payment records found.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Initiated By</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Paid At</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p, i) => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{getStudentName(p)}</td>
                      <td className="px-4 py-3 text-gray-600">{getStudentEmail(p)}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {p.currency} {p.amount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'paid' ? 'bg-green-100 text-green-800' :
                          p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          p.status === 'expired' ? 'bg-gray-100 text-gray-600' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getInitiatedBy(p)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'paid' && (
                          <button
                            onClick={() => handleDownload(p._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </CounselorLayout>
  );
}
