'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { settingsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SuperAdminSettingsPage() {
  const { user, loading } = useAuth('SUPER_ADMIN');
  const [baseAmount, setBaseAmount] = useState<number>(100);
  const [gstEnabled, setGstEnabled] = useState<boolean>(false);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    settingsAPI.get()
      .then((res) => {
        const s = res.data.data;
        setBaseAmount(s.baseAmount ?? 100);
        setGstEnabled(s.gstEnabled ?? false);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setFetching(false));
  }, [user]);

  const handleSave = async () => {
    if (baseAmount <= 0) {
      toast.error('Base amount must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      await settingsAPI.update({ baseAmount, gstEnabled });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const totalWithGst = gstEnabled ? Math.round(baseAmount * 1.18) : baseAmount;

  return (
    <>
      <Navbar />
      <SuperAdminLayout user={user}>
        <div className="p-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-500 mb-8">Configure payment amount and GST settings.</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">

            {/* Base Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Base Price (₹)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                This is the assessment fee before GST. If GST is enabled, 18% will be added on top.
              </p>
              <input
                type="number"
                min={1}
                value={baseAmount}
                onChange={(e) => setBaseAmount(Number(e.target.value))}
                className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
              />
            </div>

            {/* GST Toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                GST (18%)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                When enabled, invoices will include GST breakdown (CGST 9% + SGST 9% for Gujarat, IGST 18% for others).
              </p>
              <button
                type="button"
                onClick={() => setGstEnabled(!gstEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  gstEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    gstEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="ml-3 text-sm text-gray-700">
                {gstEnabled ? 'GST Enabled' : 'GST Disabled'}
              </span>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Payment Preview</p>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Base Amount</span>
                  <span>₹{baseAmount.toLocaleString()}</span>
                </div>
                {gstEnabled && (
                  <div className="flex justify-between text-gray-500">
                    <span>GST (18%)</span>
                    <span>₹{Math.round(baseAmount * 0.18).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-300 pt-1 mt-1">
                  <span>Total Charged to Student</span>
                  <span>₹{totalWithGst.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </SuperAdminLayout>
    </>
  );
}
