'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false,
}: DeleteConfirmationModalProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  if (!isOpen || !isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          {itemName && (
            <p className="mt-2 text-sm font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
              &quot;{itemName}&quot;
            </p>
          )}
          <p className="mt-4 text-xs text-slate-400">
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 shadow-sm shadow-red-500/20"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}