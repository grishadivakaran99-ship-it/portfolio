import React, { useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, ArrowUpRight, ArrowDownRight, X
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import { formatCurrency, formatDate } from '../lib/utils';
import { useData } from '../context/DataContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_COLORS } from '../types';

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].sort();

const defaultForm = () => ({
  type: 'expense',
  amount: '',
  category: 'Food & Dining',
  merchant: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
});

export default function TransactionsPage() {
  const { toasts, addToast, removeToast } = useToast();
  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm(defaultForm());
    setShowModal(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({
      type: t.type,
      amount: String(t.amount),
      category: t.category,
      merchant: t.merchant,
      description: t.description ?? '',
      date: t.date,
    });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        amount: parseFloat(form.amount),
        category: form.category,
        merchant: form.merchant,
        description: form.description,
        date: form.date,
      };
      if (editing) {
        await updateTransaction(editing.id, payload);
        addToast('Transaction updated!', 'success');
      } else {
        await addTransaction(payload);
        addToast('Transaction added!', 'success');
      }
      setShowModal(false);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      addToast('Transaction deleted.', 'success');
      setShowDeleteConfirm(false);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.merchant?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (loading) return <PageLoader text="Loading transactions..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="text-surface-500 text-sm mt-0.5">{filtered.length} records</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 px-4">
          <p className="text-xs text-surface-500 mb-1">Total Income</p>
          <p className="text-lg font-bold text-success-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card py-3 px-4">
          <p className="text-xs text-surface-500 mb-1">Total Expenses</p>
          <p className="text-lg font-bold text-danger-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="card py-3 px-4">
          <p className="text-xs text-surface-500 mb-1">Net</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-brand-600' : 'text-danger-600'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card py-3 px-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-44">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="input-field pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'income', 'expense']).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === t
                  ? t === 'income' ? 'bg-success-100 text-success-700'
                    : t === 'expense' ? 'bg-danger-100 text-danger-700'
                    : 'bg-brand-100 text-brand-700'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field py-2 text-sm w-auto min-w-36"
        >
          <option value="all">All Categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ArrowUpRight size={36} className="text-surface-300 mx-auto mb-2" />
            <p className="text-surface-400">No transactions found</p>
            <button onClick={openAdd} className="btn-primary mt-4 text-sm py-2 px-4 inline-flex">
              <Plus size={14} /> Add your first transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-header">Transaction</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Date</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-b border-surface-50 hover:bg-surface-50 transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          t.type === 'income' ? 'bg-success-50' : 'bg-danger-50'
                        }`}>
                          {t.type === 'income'
                            ? <ArrowUpRight size={16} className="text-success-600" />
                            : <ArrowDownRight size={16} className="text-danger-600" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 text-sm">{t.merchant || 'Unknown'}</p>
                          {t.description && (
                            <p className="text-xs text-surface-400 truncate max-w-[200px]">{t.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className="badge text-white text-xs"
                        style={{ backgroundColor: CATEGORY_COLORS[t.category] ?? '#94a3b8' }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="table-cell text-surface-500">{formatDate(t.date)}</td>
                    <td className={`table-cell text-right font-semibold text-base ${
                      t.type === 'income' ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(t); setShowDeleteConfirm(true); }}
                          className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['expense', 'income']).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      type: t,
                      category: t === 'income' ? 'Salary' : 'Food & Dining',
                    }));
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.type === t
                      ? t === 'income'
                        ? 'border-success-500 bg-success-50 text-success-700'
                        : 'border-danger-500 bg-danger-50 text-danger-700'
                      : 'border-surface-200 text-surface-500 hover:border-surface-300'
                  }`}
                >
                  {t === 'income' ? '+ Income' : '- Expense'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Amount (Rs.)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              min="1"
              step="0.01"
              placeholder="0.00"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-field"
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Merchant / Source</label>
            <input
              type="text"
              value={form.merchant}
              onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              required
              placeholder="e.g., Swiggy, HDFC Bank"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add a note..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Transaction"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-danger-50 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={20} className="text-danger-600" />
          </div>
          <p className="text-surface-600 text-sm">
            Are you sure you want to delete this transaction?
            {deleteTarget && (
              <span className="font-medium text-surface-900 block mt-1">
                {formatCurrency(deleteTarget.amount)} - {deleteTarget.merchant}
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger flex-1"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
