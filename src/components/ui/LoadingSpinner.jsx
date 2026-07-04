import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 24, className = '', text, fullScreen }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-slow">
            <span className="text-white font-bold text-xl">Rs.</span>
          </div>
          <Loader2 size={24} className="animate-spin text-brand-600" />
          {text && <p className="text-surface-500 text-sm">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 size={size} className="animate-spin text-brand-600" />
      {text && <span className="text-surface-500 text-sm">{text}</span>}
    </div>
  );
}

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-3">
      <Loader2 size={32} className="animate-spin text-brand-600" />
      <p className="text-surface-500 text-sm">{text}</p>
    </div>
  );
}
