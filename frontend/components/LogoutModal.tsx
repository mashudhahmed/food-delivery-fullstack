// components/LogoutModal.tsx
'use client';

import { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-90 bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        <div className="px-6 pt-10 pb-6 text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <LogOut className="w-7 h-7 text-red-500" />
          </div>

          {/* Title */}
          <h2 id="logout-title" className="text-xl font-bold text-slate-900 tracking-tight">
            Log out?
          </h2>

          {/* Message */}
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            You’ll need to sign in again to access your orders, favorites, and account.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow-lg shadow-red-500/20 transition"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}