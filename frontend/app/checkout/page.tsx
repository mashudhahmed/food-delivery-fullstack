'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../stores/cartStore';
import { useAddressStore } from '../../stores/addressStore';
import { api } from '../../lib/api';
import { auth } from '../../lib/auth';
import toast from 'react-hot-toast';
import { MapPin, Edit2, Navigation, Clock, CreditCard, User, Phone, Mail, Home, Building } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { selectedAddress, addresses, setSelectedAddress, setIsLocationModalOpen } = useAddressStore();
  const user = auth.getCurrentUser();
  
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  
  const restaurantId = items[0]?.restaurantId;
  const subtotal = getTotalPrice();
  const deliveryFee = 50;
  const platformFee = 20;
  const total = subtotal + deliveryFee + platformFee;

  // Sync address from address bar
  useEffect(() => {
    if (selectedAddress) {
      let fullAddress = '';
      
      if (selectedAddress.fullAddress) {
        fullAddress = selectedAddress.fullAddress;
      }
      else if (selectedAddress.street && selectedAddress.city) {
        fullAddress = `${selectedAddress.street}, ${selectedAddress.city}`;
      }
      else if (selectedAddress.area && selectedAddress.city) {
        fullAddress = `${selectedAddress.area}, ${selectedAddress.city}`;
      }
      else if (selectedAddress.name && selectedAddress.city) {
        fullAddress = `${selectedAddress.name}, ${selectedAddress.city}`;
      }
      else {
        fullAddress = `${selectedAddress.area || selectedAddress.street || selectedAddress.name}, ${selectedAddress.city || 'Dhaka'}`;
      }
      
      if (!fullAddress.toLowerCase().includes('bangladesh')) {
        fullAddress = `${fullAddress}, Bangladesh`;
      }
      
      setDeliveryAddress(fullAddress);
    } else if (user?.address) {
      setDeliveryAddress(user.address);
    }
  }, [selectedAddress, user]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  const handleSaveAddress = () => {
    if (deliveryAddress.trim()) {
      setShowAddressForm(false);
      toast.success('Address saved');
    } else {
      toast.error('Please enter a valid address');
    }
  };

  const handleUseCurrentLocation = () => {
    setIsLocationModalOpen(true);
  };

  const handlePlaceOrder = async () => {
    // Validate customer info
    if (!customerInfo.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!customerInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
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
        deliveryInstructions: deliveryInstructions,
        customerInfo: {
          fullName: customerInfo.fullName,
          email: customerInfo.email,
          phone: customerInfo.phone,
        },
        paymentMethod: selectedPaymentMethod,
        items: items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
      };

      console.log('📦 Placing order:', orderData);
      
      const response = await api.post('/orders', orderData);
      console.log('✅ Order response:', response.data);
      
      // Extract order ID from response
      const orderId = response.data?.id || response.data?.order?.id;
      
      if (!orderId) {
        console.error('No order ID in response:', response.data);
        toast.error('Order placed but unable to get order details');
        clearCart();
        router.push('/orders');
        return;
      }
      
      clearCart();
      toast.success('Order placed successfully!');
      router.push(`/orders/${orderId}`);
      
    } catch (error: any) {
      console.error('❌ Order error:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Forms */}
          <div className="flex-1 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Contact Information</h2>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={customerInfo.fullName}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Your phone number"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Your email address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Delivery Address</h2>
                </div>
              </div>
              <div className="p-5">
                {/* Saved Addresses */}
                {addresses.length > 0 && !showAddressForm && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saved Addresses
                    </label>
                    <div className="space-y-2">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddress(addr);
                            const fullAddr = addr.fullAddress || `${addr.street || addr.area}, ${addr.city}`;
                            setDeliveryAddress(fullAddr);
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition ${
                            selectedAddress?.id === addr.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-orange-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Home className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 line-clamp-1">
                                {addr.fullAddress 
                                  ? addr.fullAddress.split(',')[0] 
                                  : addr.area || addr.street}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {addr.fullAddress || `${addr.street || addr.area}, ${addr.city}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="mt-3 text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Add new address
                    </button>
                  </div>
                )}

                {/* Address Form */}
                {(showAddressForm || (!addresses.length && !deliveryAddress)) && (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House/Flat No., Street, Area, City"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={handleSaveAddress}
                      className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition"
                    >
                      Save Address
                    </button>
                  </div>
                )}

                {/* Current Location Button */}
                <button
                  onClick={handleUseCurrentLocation}
                  className="mt-4 w-full flex items-center justify-center gap-3 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium py-3 px-4 rounded-xl transition border border-orange-200"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Use Current Location</span>
                </button>

                {/* Delivery Instructions */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Gate code, landmark, or special instructions"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Payment Method</h2>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={selectedPaymentMethod === 'cash'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Cash on Delivery</p>
                    <p className="text-xs text-gray-500">Pay when you receive your order</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={selectedPaymentMethod === 'card'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Credit / Debit Card</p>
                    <p className="text-xs text-gray-500">Visa, Mastercard, Amex</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="bkash"
                    checked={selectedPaymentMethod === 'bkash'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">bKash</p>
                    <p className="text-xs text-gray-500">Mobile banking</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Order Items</h2>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between py-2">
                      <div>
                        <span className="font-medium text-gray-800">{item.quantity}x</span>
                        <span className="text-gray-600 ml-2">{item.name}</span>
                      </div>
                      <span className="text-gray-800">৳{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:w-96">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Delivery Time */}
                <div className="p-4 bg-orange-50 border-b border-orange-100">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Estimated delivery: 30-45 min</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-5 space-y-3">
                  <h3 className="font-semibold text-gray-800 mb-3">Price Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-800">৳{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="text-gray-800">৳{deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee</span>
                      <span className="text-gray-800">৳{platformFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-900">Total</span>
                        <span className="text-orange-600 text-lg">৳{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Place Order Button */}
                <div className="p-5 border-t border-gray-100">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    {loading ? 'Placing Order...' : `Place Order ৳${total.toFixed(2)}`}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-3">
                    By placing order, you agree to our Terms of Service
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}