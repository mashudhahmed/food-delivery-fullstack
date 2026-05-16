'use client';

import Link from 'next/link';
import { useCartStore } from '../stores/cartStore';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/auth';
import { useState } from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Truck, 
  Clock, 
  ChevronRight,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();

  const DELIVERY_FEE = 50;
  const MIN_ORDER_AMOUNT = 200;

  // Helper function to get numeric price (handle string or number)
  const getNumericPrice = (price: string | number): number => {
    return typeof price === 'string' ? parseFloat(price) : price;
  };

  const subtotal = getTotalPrice();
  const total = subtotal + DELIVERY_FEE;
  const isEligibleForDelivery = subtotal >= MIN_ORDER_AMOUNT;

  // Fallback emoji based on item name
  const getFoodEmoji = (itemName: string) => {
    const name = itemName.toLowerCase();
    if (name.includes('pizza')) return '🍕';
    if (name.includes('burger')) return '🍔';
    if (name.includes('sandwich')) return '🥪';
    if (name.includes('sushi')) return '🍣';
    if (name.includes('pasta')) return '🍝';
    if (name.includes('noodle')) return '🍜';
    if (name.includes('rice')) return '🍚';
    if (name.includes('biryani')) return '🍛';
    if (name.includes('curry')) return '🍛';
    if (name.includes('salad')) return '🥗';
    if (name.includes('soup')) return '🥣';
    if (name.includes('taco')) return '🌮';
    if (name.includes('burrito')) return '🌯';
    if (name.includes('chicken')) return '🍗';
    if (name.includes('wings')) return '🍗';
    if (name.includes('fish')) return '🐟';
    if (name.includes('steak')) return '🥩';
    if (name.includes('dessert')) return '🍰';
    if (name.includes('cake')) return '🎂';
    if (name.includes('ice cream')) return '🍦';
    if (name.includes('coffee')) return '☕';
    if (name.includes('tea')) return '🍵';
    if (name.includes('soda')) return '🥤';
    if (name.includes('juice')) return '🧃';
    return '🍽️';
  };

  const handleCheckout = async () => {
    if (!auth.isAuthenticated()) {
      toast.error('Please login to proceed with checkout');
      router.push('/login');
      return;
    }

    if (!isEligibleForDelivery) {
      toast.error(`Minimum order amount is ৳${MIN_ORDER_AMOUNT}. Add ৳${(MIN_ORDER_AMOUNT - subtotal).toFixed(2)} more`);
      return;
    }

    setIsCheckingOut(true);
    try {
      router.push('/checkout');
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      clearCart();
      toast.success('Cart cleared successfully');
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12 px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added any items yet</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
          >
            Browse Restaurants
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Group by restaurant
  const groupedByRestaurant = items.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = {
        name: item.restaurantName || 'Restaurant',
        items: []
      };
    }
    acc[item.restaurantId].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; items: typeof items }>);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Your Cart</h1>
          </div>
          <button
            onClick={handleClearCart}
            className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Clear Cart</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items - Left Column */}
          <div className="flex-1 space-y-6">
            {Object.entries(groupedByRestaurant).map(([restaurantId, restaurant]) => (
              <div key={restaurantId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Restaurant Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    {restaurant.name}
                  </h2>
                </div>

                {/* Cart Items */}
                <div className="divide-y divide-gray-100">
                  {restaurant.items.map((item) => {
                    const numericPrice = getNumericPrice(item.price);
                    const itemTotal = numericPrice * item.quantity;
                    
                    return (
                      <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition">
                        <div className="flex gap-4">
                          {/* Item Image - Fallback Emoji */}
                          <div className="w-20 h-20 bg-linear-to-br from-orange-100 to-orange-50 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                            <span className="text-3xl">{getFoodEmoji(item.name)}</span>
                          </div>

                          {/* Item Details */}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-800">{item.name}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">৳{numericPrice.toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-gray-400 hover:text-red-500 transition p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3 mt-3">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                              >
                                <Minus className="w-3 h-3 text-gray-600" />
                              </button>
                              <span className="w-8 text-center font-medium text-gray-700">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                              >
                                <Plus className="w-3 h-3 text-gray-600" />
                              </button>
                              <span className="ml-4 text-sm font-semibold text-gray-800">
                                ৳{itemTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary - Right Column */}
          <div className="lg:w-96">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              
              {/* Items breakdown */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <div className="flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    <span>Delivery Fee</span>
                  </div>
                  <span>৳{DELIVERY_FEE.toFixed(2)}</span>
                </div>
              </div>

              {/* Delivery eligibility warning */}
              {!isEligibleForDelivery && (
                <div className="bg-amber-50 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Add ৳{(MIN_ORDER_AMOUNT - subtotal).toFixed(2)} more to be eligible for delivery
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100 my-4"></div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-orange-500">৳{total.toFixed(2)}</span>
                  <p className="text-xs text-gray-500">Including delivery fee</p>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut || !isEligibleForDelivery}
                className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  isEligibleForDelivery
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
              </button>

              {/* Additional info */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>30-40 min delivery</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  <span>Free delivery above ৳500</span>
                </div>
              </div>

              {/* Continue Shopping Link */}
              <Link 
                href="/"
                className="block text-center mt-4 text-sm text-orange-500 hover:text-orange-600"
              >
                Continue Shopping →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}