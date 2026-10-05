'use client';

import { useState, useEffect, JSX } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Clock, CreditCard, Wallet, Smartphone } from 'lucide-react';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderId: string;
  orderTotal?: number | string;
  restaurantName?: string;
  paymentMethod?: string;
  timeRemaining?: { minutes: number; seconds: number } | null;
  loading?: boolean;
}

export default function CancelOrderModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  orderTotal,
  restaurantName,
  paymentMethod,
  timeRemaining,
  loading = false,
}: CancelOrderModalProps) {
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

  const getPaymentMethodDisplay = (method?: string) => {
    const methods: Record<string, { label: string; icon: JSX.Element; color: string }> = {
      cash: { 
        label: 'Cash on Delivery', 
        icon: <Wallet className="w-4 h-4" />,
        color: 'text-green-600'
      },
      card: { 
        label: 'Credit/Debit Card', 
        icon: <CreditCard className="w-4 h-4" />,
        color: 'text-blue-600'
      },
      bkash: { 
        label: 'bKash', 
        icon: <Smartphone className="w-4 h-4" />,
        color: 'text-pink-600'
      },
    };
    return methods[method || 'cash'] || methods.cash;
  };

  const formatTotalAmount = (total: number | string | undefined): string => {
    if (total === undefined || total === null) return '0.00';
    const numTotal = typeof total === 'string' ? parseFloat(total) : total;
    return isNaN(numTotal) ? '0.00' : numTotal.toFixed(2);
  };

  const paymentInfo = getPaymentMethodDisplay(paymentMethod);
  const formattedTotal = formatTotalAmount(orderTotal);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl shadow-slate-900/20 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Cancel Order?</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
            disabled={loading}
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <p className="text-sm text-red-800 font-medium">
              Are you sure you want to cancel this order?
            </p>
            <p className="text-xs text-red-600 mt-1">
              This action cannot be undone.
            </p>
          </div>

          {/* Order Details */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Order ID:</span>
              <span className="font-mono text-slate-800">#{orderId.slice(-8).toUpperCase()}</span>
            </div>
            {restaurantName && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Restaurant:</span>
                <span className="font-medium text-slate-800">{restaurantName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Amount:</span>
              <span className="font-bold text-red-600">৳{formattedTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Payment:</span>
              <span className={`flex items-center gap-1 ${paymentInfo.color}`}>
                {paymentInfo.icon}
                {paymentInfo.label}
              </span>
            </div>
          </div>

          {/* Time Remaining Warning */}
          {timeRemaining && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-200/60">
              <Clock className="w-4 h-4 shrink-0" />
              <p className="text-xs">
                You have <span className="font-bold">{timeRemaining.minutes}:{String(timeRemaining.seconds).padStart(2, '0')}</span> remaining to cancel this order.
              </p>
            </div>
          )}

          {/* Important Note */}
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600">⚠️ By cancelling:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5 text-slate-500">
              <li>Your order will be immediately cancelled</li>
              {paymentMethod !== 'cash' && (
                <li>Refund will be processed within 5-7 business days</li>
              )}
              {paymentMethod === 'cash' && (
                <li>No payment will be collected</li>
              )}
              <li>You can place a new order anytime</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-red-500/20"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Yes, Cancel Order
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition disabled:opacity-50"
          >
            Keep Order
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}