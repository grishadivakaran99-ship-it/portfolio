import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, IndianRupee, Save, Zap, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ToastContainer } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { formatCurrency, getInitials, getCurrentMonth, getCurrentYear } from '../lib/utils';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getTransactions } from '../api/transactions';
import { getDashboardStats } from '../api/analytics';
import { sendTestEmail, checkArcjetRateLimit } from '../api/email';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    monthly_income: '',
    currency: 'INR',
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalTransactions: 0, totalIncome: 0, totalExpenses: 0, totalSavings: 0 });

  // Rate limiting state for test button
  const [testLoading, setTestLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 5, blocked: false, retryAfter: 0 });

  // Arcjet rate limit test state
  const [arcjetLoading, setArcjetLoading] = useState(false);
  const [arcjetInfo, setArcjetInfo] = useState({ remaining: 5, blocked: false, retryAfter: 0, resetTime: null });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        monthly_income: String(profile.monthly_income ?? ''),
        currency: profile.currency ?? 'INR',
      });
    }
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        const [txns, dashStats] = await Promise.all([
          getTransactions(1000),
          getDashboardStats(getCurrentMonth(), getCurrentYear()),
        ]);
        setStats({
          totalTransactions: txns.length,
          totalIncome: dashStats.totalIncome,
          totalExpenses: dashStats.totalExpenses,
          totalSavings: dashStats.totalSavings,
        });
      } catch {}
    })();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          phone: form.phone,
          monthly_income: parseFloat(form.monthly_income) || 0,
          currency: form.currency,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      addToast('Profile updated successfully!', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestButton() {
    setTestLoading(true);
    try {
      const emailResult = await sendTestEmail(user?.email, form.full_name);

      if (emailResult.success) {
        addToast('Test email sent successfully!', 'success');
      } else {
        addToast(emailResult.message, 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setTestLoading(false);
    }
  }

  async function handleArcjetTest() {
    setArcjetLoading(true);
    try {
      const result = await checkArcjetRateLimit(`arcjet-test-${user?.id || 'anon'}`, { max: 5, window: '1m' });

      setArcjetInfo({
        remaining: result.remaining,
        blocked: !result.allowed,
        retryAfter: result.retryAfter,
        resetTime: result.reset,
      });

      if (!result.allowed) {
        addToast(`Arcjet: Rate limit hit! Wait ${result.retryAfter} seconds.`, 'error');
      } else {
        addToast(`Arcjet: Request allowed (${result.remaining} remaining)`, 'success');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setArcjetLoading(false);
    }
  }

  const displayName = form.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div>
        <h1 className="page-title">Profile & Settings</h1>
        <p className="text-surface-500 text-sm mt-0.5">Manage your account information</p>
      </div>

      {/* Profile Header */}
      <div className="card flex items-center gap-5">
        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-xl font-bold">
              {getInitials(displayName)}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-surface-900">{displayName}</h2>
          <p className="text-surface-500 text-sm">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge badge-green">Active</span>
            <span className="badge badge-blue">Free Plan</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Transactions', value: String(stats.totalTransactions) },
          { label: 'Income', value: formatCurrency(stats.totalIncome) },
          { label: 'Expenses', value: formatCurrency(stats.totalExpenses) },
          { label: 'Savings', value: formatCurrency(stats.totalSavings) },
        ].map(({ label, value }) => (
          <div key={label} className="card py-3 px-4 text-center">
            <p className="text-xs text-surface-500 mb-1">{label}</p>
            <p className="font-bold text-surface-900 text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="card space-y-5">
        <h3 className="text-base font-semibold text-surface-900">Personal Information</h3>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Your full name"
              className="input-field pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="input-field pl-10 opacity-60 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-surface-400 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Phone Number</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="input-field pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Monthly Income (Rs.)</label>
          <div className="relative">
            <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="number"
              value={form.monthly_income}
              onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
              placeholder="Your monthly income"
              min="0"
              className="input-field pl-10"
            />
          </div>
          <p className="text-xs text-surface-400 mt-1">Used for savings rate calculations and recommendations</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="input-field"
          >
            <option value="INR">INR - Indian Rupee (Rs.)</option>
          </select>
        </div>

        <div className="pt-2 border-t border-surface-100">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Test Email Section */}
      <div className="card space-y-4">
        <h3 className="text-base font-semibold text-surface-900">Email Integration Test</h3>

        <p className="text-sm text-surface-500">
          Test the Resend email integration. Requires VITE_RESEND_API_KEY in .env. Used for budget alert emails.
        </p>

        <button
          onClick={handleTestButton}
          disabled={testLoading}
          className="btn-secondary w-full"
        >
          {testLoading ? <LoadingSpinner size={16} /> : <Send size={16} />}
          {testLoading ? 'Sending...' : 'Send Test Email'}
        </button>
      </div>

      {/* Arcjet Rate Limit Test Section */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-surface-900">Arcjet Rate Limiting Test</h3>
          <span className={`badge ${arcjetInfo.remaining > 2 ? 'badge-green' : arcjetInfo.remaining > 0 ? 'badge-yellow' : 'badge-red'}`}>
            {arcjetInfo.remaining}/5 requests left
          </span>
        </div>

        <p className="text-sm text-surface-500">
          Test Arcjet-style rate limiting. Max 5 clicks per minute. Simulates DDoS protection.
        </p>

        {arcjetInfo.blocked && (
          <div className="flex items-center gap-3 p-3 bg-danger-50 border border-danger-200 rounded-xl">
            <AlertTriangle size={18} className="text-danger-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-danger-700 text-sm">Rate Limit Hit</p>
              <p className="text-danger-600 text-xs">Wait {arcjetInfo.retryAfter} seconds before trying again.</p>
            </div>
          </div>
        )}

        <button
          onClick={handleArcjetTest}
          disabled={arcjetLoading || arcjetInfo.blocked}
          className="btn-secondary w-full"
        >
          {arcjetLoading ? <LoadingSpinner size={16} /> : <Zap size={16} />}
          {arcjetLoading ? 'Testing...' : 'Test Rate Limit'}
        </button>
      </div>

      {/* Account Info */}
      <div className="card space-y-4">
        <h3 className="text-base font-semibold text-surface-900">Account Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-surface-50">
            <span className="text-surface-500">Account ID</span>
            <span className="text-surface-700 font-mono text-xs">{user?.id.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-50">
            <span className="text-surface-500">Sign-in method</span>
            <span className="text-surface-700 capitalize">
              {user?.app_metadata?.provider ?? 'Email'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-50">
            <span className="text-surface-500">Member since</span>
            <span className="text-surface-700">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-surface-500">Timezone</span>
            <span className="text-surface-700">Asia/Kolkata (IST)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
