import React, { useState, useRef } from 'react';
import { Upload, ScanLine, CheckCircle, AlertCircle, Camera, FileImage, Plus, X } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ToastContainer } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { formatCurrency, fileToBase64 } from '../lib/utils';
import { scanReceipt, saveReceiptScan } from '../api/ai';
import { createTransaction } from '../api/transactions';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../types';

export default function ScannerPage() {
  const { toasts, addToast, removeToast } = useToast();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('idle');
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editedData, setEditedData] = useState({
    merchant: '',
    amount: '',
    date: '',
    category: 'Other',
  });

  function handleFile(f) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setExtracted(null);
    setErrorMsg('');
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  }

  async function handleScan() {
    if (!file) return;
    setStatus('scanning');
    setErrorMsg('');
    try {
      const base64 = await fileToBase64(file);
      const result = await scanReceipt(base64, file.type);
      setExtracted(result);
      setEditedData({
        merchant: result.merchant,
        amount: result.amount ? String(result.amount) : '',
        date: result.date ?? new Date().toISOString().split('T')[0],
        category: result.category,
      });
      setStatus('done');
      await saveReceiptScan({
        image_url: '',
        raw_text: result.raw_text,
        extracted_amount: result.amount,
        extracted_merchant: result.merchant,
        extracted_date: result.date,
        extracted_category: result.category,
        confidence_score: result.confidence,
        status: 'completed',
        transaction_id: null,
      });
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message ?? 'Failed to scan receipt');
      addToast(e.message ?? 'Scan failed', 'error');
    }
  }

  async function handleAddTransaction() {
    setAdding(true);
    try {
      await createTransaction({
        type: 'expense',
        amount: parseFloat(editedData.amount),
        category: editedData.category,
        merchant: editedData.merchant,
        date: editedData.date,
        description: 'Added from receipt scan',
      });
      addToast('Transaction added from receipt!', 'success');
      setShowAddModal(false);
      setStatus('idle');
      setExtracted(null);
      setFile(null);
      setPreview(null);
    } catch (e) {
      addToast(e.message ?? 'Failed to add transaction', 'error');
    } finally {
      setAdding(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setExtracted(null);
    setErrorMsg('');
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div>
        <h1 className="page-title">AI Receipt Scanner</h1>
        <p className="text-surface-500 text-sm mt-0.5">
          Upload a receipt photo and AI will extract merchant, amount, date, and category automatically.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="card border-2 border-dashed border-surface-200 hover:border-brand-300 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {preview ? (
          <div className="relative">
            <img src={preview} alt="Receipt" className="max-h-64 object-contain mx-auto rounded-xl" />
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-surface-600 hover:text-danger-600"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
              <ScanLine size={28} className="text-brand-600" />
            </div>
            <p className="text-surface-700 font-medium mb-1">Drop receipt here or click to upload</p>
            <p className="text-surface-400 text-sm">Supports JPG, PNG, WebP up to 10MB</p>
            <div className="flex gap-3 mt-4">
              <span className="flex items-center gap-1 text-xs text-surface-400">
                <FileImage size={14} /> Image file
              </span>
              <span className="flex items-center gap-1 text-xs text-surface-400">
                <Camera size={14} /> Camera capture
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scan Button */}
      {file && status !== 'done' && (
        <button
          onClick={handleScan}
          disabled={status === 'scanning'}
          className="btn-primary w-full py-3 text-base"
        >
          {status === 'scanning' ? (
            <>
              <LoadingSpinner size={18} />
              Scanning with Groq AI...
            </>
          ) : (
            <>
              <ScanLine size={18} />
              Scan Receipt
            </>
          )}
        </button>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="card border border-danger-200 bg-danger-50 flex items-center gap-3">
          <AlertCircle size={20} className="text-danger-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-danger-700 text-sm">Scan Failed</p>
            <p className="text-danger-600 text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'done' && extracted && (
        <div className="card space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-success-600" />
            <h3 className="font-semibold text-surface-900">Receipt Scanned Successfully</h3>
            <span className="badge badge-green ml-auto">{Math.round(extracted.confidence * 100)}% confidence</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xs text-surface-500 mb-1">Merchant</p>
              <p className="font-semibold text-surface-900">{extracted.merchant || 'Not detected'}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xs text-surface-500 mb-1">Amount</p>
              <p className="font-semibold text-success-600 text-lg">
                {extracted.amount ? formatCurrency(extracted.amount) : 'Not detected'}
              </p>
            </div>
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xs text-surface-500 mb-1">Date</p>
              <p className="font-semibold text-surface-900">{extracted.date ?? 'Not detected'}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xs text-surface-500 mb-1">Category</p>
              <span
                className="badge text-white"
                style={{ backgroundColor: CATEGORY_COLORS[extracted.category] ?? '#94a3b8' }}
              >
                {extracted.category}
              </span>
            </div>
          </div>

          {extracted.raw_text && (
            <details className="bg-surface-50 rounded-xl p-4 cursor-pointer">
              <summary className="text-xs font-medium text-surface-500 select-none">View extracted text</summary>
              <p className="mt-2 text-xs text-surface-600 font-mono whitespace-pre-wrap leading-relaxed">
                {extracted.raw_text}
              </p>
            </details>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={reset} className="btn-secondary flex-1">
              Scan Another
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex-1"
              disabled={!extracted.amount}
            >
              <Plus size={16} />
              Add as Transaction
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      {status === 'idle' && !file && (
        <div className="card bg-brand-50 border-brand-100">
          <h3 className="font-semibold text-brand-900 mb-3 text-sm">How it works</h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Upload Receipt', desc: 'Take a photo or upload from your gallery' },
              { step: '2', title: 'AI Extraction', desc: 'Groq AI reads merchant name, amount, date, and category' },
              { step: '3', title: 'Review & Save', desc: 'Verify extracted data and add it as a transaction' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-brand-900 text-sm">{title}</p>
                  <p className="text-brand-600 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Transaction from Receipt"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-500">Review and confirm the extracted details before saving.</p>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Merchant</label>
            <input
              type="text"
              value={editedData.merchant}
              onChange={(e) => setEditedData({ ...editedData, merchant: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Amount (Rs.)</label>
            <input
              type="number"
              value={editedData.amount}
              onChange={(e) => setEditedData({ ...editedData, amount: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Date</label>
            <input
              type="date"
              value={editedData.date}
              onChange={(e) => setEditedData({ ...editedData, date: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Category</label>
            <select
              value={editedData.category}
              onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
              className="input-field"
            >
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleAddTransaction}
              disabled={adding || !editedData.amount}
              className="btn-primary flex-1"
            >
              {adding ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
