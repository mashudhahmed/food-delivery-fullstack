'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import { useAddressStore } from '@/stores/addressStore';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import LocationModal from '@/components/LocationModal';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { selectedAddress, setIsLocationModalOpen, isLocationModalOpen } =
    useAddressStore();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = getTotalPrice();
  // Backend hardcodes deliveryFee = 50 and platformFee = 20
  const deliveryFee = 50;
  const platformFee = 20;
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

    // ✅ Payload matches CreateOrderDto exactly – no extra fields
    const payload = {
      restaurantId: items[0].restaurantId,
      items: items.map((i) => ({
        menuItemId: i.id,
        quantity: i.quantity,
      })),
      deliveryAddress: addressText,
      paymentMethod,
      deliveryInstructions: notes.trim() || undefined,
      customerInfo: {
        fullName: currentUser.fullName || currentUser.name || '',
        email: currentUser.email,
        phone: currentUser.phone || '',
      },
    };

    try {
      setLoading(true);
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
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to place order',
      );
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
    <div className="max-w-2xl mx-auto p-6">
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
            <span>Delivery Fee</span>
            <span>৳{deliveryFee}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform Fee</span>
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
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
            />
            Cash on Delivery
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
            />
            Card (coming soon)
          </label>
        </div>
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