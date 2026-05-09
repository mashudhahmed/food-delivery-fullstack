'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../stores/cartStore';
import { api } from '../lib/api';
import { auth } from '../lib/api';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const user = auth.getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const restaurantId = items[0]?.restaurantId;
  const subtotal = getTotalPrice();
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        restaurantId: restaurantId,
        deliveryAddress: deliveryAddress,
        items: items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
      };

      const response = await api.post('/orders', orderData);
      clearCart();
      toast.success('Order placed successfully!');
      router.push(`/orders/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Order Details */}
        <div className="flex-1">
          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
            <textarea
              className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Enter your full delivery address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between py-2 border-b">
                  <div>
                    <span className="font-medium">{item.quantity}x</span> {item.name}
                  </div>
                  <span>৳{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-96">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>৳{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>৳{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : `Place Order ৳${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}