import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { classNames } from '../../lib/utils';

const icons = {
  success: <CheckCircle size={18} className="text-success-600" />,
  error: <XCircle size={18} className="text-danger-600" />,
  warning: <AlertCircle size={18} className="text-warning-600" />,
  info: <Info size={18} className="text-brand-600" />,
};

const styles = {
  success: 'border-success-200 bg-success-50',
  error: 'border-danger-200 bg-danger-50',
  warning: 'border-warning-200 bg-warning-50',
  info: 'border-brand-200 bg-brand-50',
};

export function Toast({ message, type, onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={classNames(
      'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-elevated animate-slide-in-right',
      styles[type]
    )}>
      <div className="mt-0.5 flex-shrink-0">{icons[type]}</div>
      <p className="text-sm text-surface-800 font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-surface-400 hover:text-surface-600 transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
