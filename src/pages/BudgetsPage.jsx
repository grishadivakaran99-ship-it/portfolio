import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Target, AlertTriangle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { ToastContainer } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { formatCurrency, getCurrentMonth, getCurrentYear, getMonthName, classNames } from '../lib/utils';
import { useData } from '../context/DataContext';
import { EXPENSE_CATEGORIES } from '../types';

export default function BudgetsPage() {
  const { toasts, addToast, removeToast } = useToast();
  const month = getCurrentMonth();
  const year = getCurrentYear();

  const {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    category: 'Food & Dining',
    monthly_limit: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function openAdd() {
    setEditing(null);
    setForm({ category: 'Food & Dining', monthly_limit: '' });
    setShowModal(true);
  }

  function openEdit(b) {
    setEditing(b);
    setForm({ category: b.category, monthly_limit: String(b.monthly_limit) });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        monthly_limit: parseFloat(form.monthly_limit),
        month,
        year,
      };
      if (editing) {
        await updateBudget(editing.id, payload);
        addToast('Budget updated!', 'success');
      } else {
        await addBudget(payload);
        addToast('Budget created!', 'success');
      }
      setShowModal(false);
    } catch (e) {
      addToast(e.message ?? 'Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBudget(deleteTarget.id);
      addToast('Budget deleted.', 'success');
      setDeleteTarget(null);
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  if (loading) return <PageLoader text="Loading budgets..." />;

  const totalBudget = budgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudget = budgets.filter((b) => b.percentage > 100).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="text-surface-500 text-sm mt-0.5">{getMonthName(month, year)}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} />
          Add Budget
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 px-4">
          <p className="text-xs text-surface-500 mb-1">Total Budget</p>
          <p className="text-lg font-bold text-surface-900">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="card py-3 px-4">
          <p className="text-xs text-surface-500 mb-1">Total Spent</p>
          <p className="text-lg font-bold text-danger-600">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="card py-3 px-4">
          <p className="text-xs text-surface-500 mb-1">Remaining</p>
          <p className={`text-lg font-bold ${totalBudget - totalSpent >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatCurrency(totalBudget - totalSpent)}
          </p>
        </div>
      </div>

      {overBudget > 0 && (
        <div className="card border-danger-200 bg-danger-50 flex items-center gap-3 py-3 px-4">
          <AlertTriangle size={18} className="text-danger-600 flex-shrink-0" />
          <p className="text-danger-700 text-sm font-medium">
            {overBudget} budget{overBudget > 1 ? 's' : ''} exceeded this month!
          </p>
        </div>
      )}

      {/* Budget Cards */}
      {budgets.length === 0 ? (
        <div className="card text-center py-16">
          <Target size={40} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500 font-medium mb-1">No budgets set for {getMonthName(month, year)}</p>
          <p className="text-surface-400 text-sm mb-5">Set monthly spending limits per category.</p>
          <button onClick={openAdd} className="btn-primary inline-flex">
            <Plus size={16} /> Create First Budget
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const status = b.percentage > 100 ? 'danger' : b.percentage > 80 ? 'warning' : 'good';
            return (
              <div key={b.id} className="card-hover space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-surface-900">{b.category}</p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {formatCurrency(b.spent)} of {formatCurrency(b.monthly_limit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {status === 'danger' ? (
                      <span className="badge badge-red">Over</span>
                    ) : status === 'warning' ? (
                      <span className="badge badge-yellow">Near Limit</span>
                    ) : (
                      <span className="badge badge-green">On Track</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-surface-500 mb-1.5">
                    <span>{b.percentage}% used</span>
                    <span>{formatCurrency(Math.max(b.monthly_limit - b.spent, 0))} left</span>
                  </div>
                  <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className={classNames(
                        'h-full rounded-full transition-all duration-700',
                        status === 'danger' ? 'bg-danger-500' :
                        status === 'warning' ? 'bg-warning-500' : 'bg-brand-500'
                      )}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Alert status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: '80%', sent: b.alert_80_sent },
                    { label: '90%', sent: b.alert_90_sent },
                    { label: '100%', sent: b.alert_100_sent },
                  ].map(({ label, sent }) => (
                    <span key={label} className={classNames(
                      'badge text-xs',
                      sent ? 'bg-warning-100 text-warning-700' : 'bg-surface-100 text-surface-400'
                    )}>
                      {sent ? '!' : 'o'} {label}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1 border-t border-surface-50">
                  <button
                    onClick={() => openEdit(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-surface-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-surface-600 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Budget' : 'Add Budget'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-field"
            >
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Monthly Limit (Rs.)</label>
            <input
              type="number"
              value={form.monthly_limit}
              onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
              required
              min="1"
              placeholder="e.g., 10000"
              className="input-field"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Budget"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-danger-50 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={20} className="text-danger-600" />
          </div>
          <p className="text-surface-600 text-sm">
            Delete the <span className="font-medium text-surface-900">{deleteTarget?.category}</span> budget?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
