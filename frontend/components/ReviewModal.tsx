'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, Loader2, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { showErrorToast } from '@/lib/error-handler';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  restaurantId: string;
  restaurantName?: string;
  onSuccess?: () => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  restaurantId,
  restaurantName,
  onSuccess,
}: ReviewModalProps) {
  const [isClient, setIsClient] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !restaurantId) {
      toast.error('Missing order or restaurant information');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/reviews', {
        orderId,
        restaurantId,
        rating,
        comment: comment.trim() || undefined,
      });

      toast.success('Thank you! Your review has been submitted.');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      showErrorToast(err, 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return '';
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl shadow-slate-900/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Rate Your Experience</h2>
              {restaurantName && (
                <p className="text-xs text-slate-500">{restaurantName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Rating Stars */}
          <div className="text-center space-y-2">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-115 focus:outline-hidden"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {getRatingLabel(hoverRating || rating)}
            </p>
          </div>

          {/* Feedback textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Your Review (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the food and packaging? Share your thoughts..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Review</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
