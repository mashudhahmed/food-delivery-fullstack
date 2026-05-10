'use client';

import { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
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

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-200 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-xl">
        {/* Close button */}
        <div className="flex justify-end pt-4 pr-4">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <LogOut className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-center text-gray-800 mb-2">
          Logging out?
        </h3>

        {/* Message */}
        <p className="text-center text-gray-500 mb-6 px-6">
          Thanks for stopping by. See you again soon!
        </p>

        {/* Buttons */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-gray-600 font-medium hover:bg-gray-50 transition rounded-bl-2xl"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 text-red-600 font-medium hover:bg-red-50 transition rounded-br-2xl border-l border-gray-100"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}