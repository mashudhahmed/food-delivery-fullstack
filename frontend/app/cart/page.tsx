'use client';

import Link from 'next/link';
import { useCartStore } from '../stores/cartStore';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/auth';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();

  const handleCheckout = () => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <Link href="/" className="text-orange-600 hover:underline">
            Browse Restaurants →
          </Link>
        </div>
      </div>
    );
  }

  // Group by restaurant
  const groupedByRestaurant = items.reduce((acc, item) => {
    if (!acc[item.restaurantId]) acc[item.restaurantId] = [];
    acc[item.restaurantId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="flex-1">
          {Object.entries(groupedByRestaurant).map(([restaurantId, restaurantItems]) => (
            <div key={restaurantId} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">{restaurantItems[0].restaurantName || 'Restaurant'}</h2>
              <div className="space-y-4">
                {restaurantItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">৳{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-4 text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:w-96">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>৳{getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>৳50.00</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>৳{(getTotalPrice() + 50).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-orange-600 text-white py-3 rounded-md hover:bg-orange-700 transition-colors"
            >
              Proceed to Checkout
            </button>
            <button
              onClick={clearCart}
              className="w-full mt-2 text-gray-500 text-sm hover:text-gray-700"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}