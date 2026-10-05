'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import { useAddressStore } from '@/stores/addressStore';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import LocationModal from '@/components/LocationModal';
import toast from 'react-hot-toast';
import { showErrorToast } from '@/lib/error-handler';
import { Wallet, CreditCard, Smartphone, ShieldCheck, Lock, Check } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { selectedAddress, setIsLocationModalOpen, isLocationModalOpen } =
    useAddressStore();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bkash'>('cash');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const uniqueRestaurantIds = Array.from(new Set(items.map((i) => i.restaurantId)));
  const restaurantCount = uniqueRestaurantIds.length || 1;

  const subtotal = getTotalPrice();
  // Backend charges deliveryFee = 50 and platformFee = 20 per restaurant
  const deliveryFee = 50 * restaurantCount;
  const platformFee = 20 * restaurantCount;
  const total = subtotal + deliveryFee + platformFee;

  const addressText =
    selectedAddress?.fullAddress ||
    [selectedAddress?.street, selectedAddress?.area, selectedAddress?.city]
      .filter(Boolean)
      .join(', ') ||
    '';

  async function placeOrder() {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      toast.error('Please login first');
      return;
    }
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!addressText) {
      toast.error('Please set a delivery address');
      setIsLocationModalOpen(true);
      return;
    }

    const customerInfo = {
      fullName: currentUser.fullName || currentUser.name || '',
      email: currentUser.email,
      phone: currentUser.phone || '',
    };

    if (paymentMethod === 'card') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length !== 16 || !/^\d+$/.test(cleanCard)) {
        toast.error('Please enter a valid 16-digit card number');
        return;
      }
      if (!cardHolder.trim()) {
        toast.error('Please enter the cardholder name');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {
        toast.error('Please enter card expiry date in MM/YY format');
        return;
      }
      if (!/^\d{3,4}$/.test(cardCvv.trim())) {
        toast.error('Please enter a valid 3 or 4-digit CVV');
        return;
      }
    }

    if (paymentMethod === 'bkash') {
      const cleanBkash = bkashNumber.replace(/\s+/g, '');
      if (!/^01[3-9]\d{8}$/.test(cleanBkash)) {
        toast.error('Please enter a valid 11-digit bKash number (e.g. 01712345678)');
        return;
      }
    }

    setLoading(true);

    try {
      if (uniqueRestaurantIds.length > 1) {
        // Multi-restaurant checkout
        const multiPayload = {
          restaurants: uniqueRestaurantIds.map((restId) => ({
            restaurantId: restId,
            items: items
              .filter((i) => i.restaurantId === restId)
              .map((i) => ({
                menuItemId: i.id,
                quantity: i.quantity,
              })),
          })),
          deliveryAddress: addressText,
          paymentMethod,
          deliveryInstructions: notes.trim() || undefined,
          customerInfo,
        };

        const res = await api.post('/orders/multi', multiPayload);
        const result = res.data?.data || res.data;
        const orderIds = result?.summary?.orderIds || result?.orders?.map((o: any) => o.id) || [];

        clearCart();
        toast.success(result?.message || 'Orders placed successfully!');
        if (orderIds.length > 0) {
          router.push(`/orders/${orderIds[0]}`);
        } else {
          router.push('/orders');
        }
      } else {
        // Single-restaurant checkout
        const payload = {
          restaurantId: items[0].restaurantId,
          items: items.map((i) => ({
            menuItemId: i.id,
            quantity: i.quantity,
          })),
          deliveryAddress: addressText,
          paymentMethod,
          deliveryInstructions: notes.trim() || undefined,
          customerInfo,
        };

        const res = await api.post('/orders', payload);
        const order = res.data?.data || res.data;
        const orderId = order?.id || order?.order?.id;

        if (!orderId) {
          toast.error('Order placed but response was unexpected');
          console.error('Unexpected order response', res.data);
          return;
        }

        clearCart();
        toast.success('Order placed successfully!');
        router.push(`/orders/${orderId}`);
      }
    } catch (err: unknown) {
      showErrorToast(err, 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-orange-500 text-white rounded-lg"
        >
          Browse Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Order Summary */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Order Summary</h2>
        <div className="space-y-2 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>৳{(Number(item.price) * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>৳{subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee {restaurantCount > 1 ? `(৳50 × ${restaurantCount} restaurants)` : ''}</span>
            <span>৳{deliveryFee}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform Fee {restaurantCount > 1 ? `(৳20 × ${restaurantCount} restaurants)` : ''}</span>
            <span>৳{platformFee}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1">
            <span>Total</span>
            <span>৳{total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Delivery Address</h2>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="text-sm text-orange-600"
          >
            {addressText ? 'Change' : 'Set Address'}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          {addressText || 'No address set'}
        </p>
      </div>

      {/* Payment Method */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Payment Method</h2>
        
        {/* Payment Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Cash */}
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              paymentMethod === 'cash'
                ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`p-2 rounded-lg ${paymentMethod === 'cash' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                <Wallet className="w-4 h-4" />
              </span>
              {paymentMethod === 'cash' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">Cash on Delivery</p>
              <p className="text-xs text-gray-400 mt-0.5">Pay at your doorstep</p>
            </div>
          </button>

          {/* Card */}
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              paymentMethod === 'card'
                ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`p-2 rounded-lg ${paymentMethod === 'card' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                <CreditCard className="w-4 h-4" />
              </span>
              {paymentMethod === 'card' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">Credit / Debit Card</p>
              <p className="text-xs text-gray-400 mt-0.5">Visa, Mastercard, Amex</p>
            </div>
          </button>

          {/* bKash */}
          <button
            type="button"
            onClick={() => setPaymentMethod('bkash')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              paymentMethod === 'bkash'
                ? 'border-pink-500 bg-pink-50/40 ring-1 ring-pink-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`p-2 rounded-lg ${paymentMethod === 'bkash' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500'}`}>
                <Smartphone className="w-4 h-4" />
              </span>
              {paymentMethod === 'bkash' && <span className="w-2 h-2 rounded-full bg-pink-500" />}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">bKash</p>
              <p className="text-xs text-gray-400 mt-0.5">Direct mobile payment</p>
            </div>
          </button>
        </div>

        {/* Card Details Form */}
        {paymentMethod === 'card' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Card Details</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> 256-bit Secure
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Card Number</label>
              <input
                type="text"
                placeholder="4111 2222 3333 4444"
                maxLength={19}
                value={cardNumber}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
                  setCardNumber(formatted);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Cardholder Name</label>
              <input
                type="text"
                placeholder="JOHN DOE"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Expiry (MM/YY)</label>
                <input
                  type="text"
                  placeholder="12/28"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (val.length >= 3) {
                      val = `${val.slice(0, 2)}/${val.slice(2)}`;
                    }
                    setCardExpiry(val);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">CVV / CVC</label>
                <input
                  type="password"
                  placeholder="123"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* bKash Details Form */}
        {paymentMethod === 'bkash' && (
          <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-pink-700 uppercase tracking-wider">bKash Mobile Account</span>
              <span className="text-[11px] text-pink-600 font-medium bg-pink-100 px-2 py-0.5 rounded-full">
                Instant Checkout
              </span>
            </div>

            <div>
              <label className="block text-xs text-pink-800 mb-1">bKash Account Number</label>
              <input
                type="text"
                placeholder="01712345678"
                maxLength={11}
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="w-full px-3 py-2 bg-white border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-mono"
              />
            </div>
            <p className="text-xs text-pink-600">
              You will be prompted to enter your bKash PIN on your handset or simulate approval upon placing the order.
            </p>
          </div>
        )}

        {/* Cash Notes */}
        {paymentMethod === 'cash' && (
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Please have exact change of ৳{total.toFixed(0)} ready for the delivery rider upon arrival.</span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <textarea
          placeholder="Any special instructions? (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm"
          rows={3}
        />
      </div>

      <button
        onClick={placeOrder}
        disabled={loading}
        className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-lg hover:bg-orange-600 disabled:opacity-60"
      >
        {loading ? 'Placing Order...' : `Place Order • ৳${total.toFixed(0)}`}
      </button>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
}