'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/app/lib/api';
import { Order } from '@/app/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'preparing', 'ready', 'picked_up', 'delivered'];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-red-600">Order not found</div>
      </div>
    );
  }

  const statusSteps = ['pending', 'preparing', 'ready', 'picked_up', 'delivered'];
  const currentStep = getStatusStep(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/orders" className="text-orange-600 hover:underline mb-4 inline-block">
        ← Back to Orders
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h1>
            <p className="text-gray-500">
              Placed on {new Date(order.placedAt).toLocaleDateString()} at{' '}
              {new Date(order.placedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-orange-600">৳{order.totalAmount}</span>
          </div>
        </div>

        {/* Order Status Tracker */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Order Status</h2>
          <div className="relative">
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 rounded-full">
              <div
                className="absolute top-0 left-0 h-1 bg-orange-600 rounded-full transition-all"
                style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>
            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => (
                <div key={step} className="text-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      index <= currentStep ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {index <= currentStep ? '✓' : index + 1}
                  </div>
                  <div className={`text-xs ${index <= currentStep ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                    {step.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="border-t pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Restaurant</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="font-medium">{order.restaurant?.name}</div>
            <div className="text-sm text-gray-600 mt-1">{order.restaurant?.address}</div>
            <div className="text-sm text-gray-600">{order.restaurant?.phone}</div>
          </div>
        </div>

        {/* Order Items */}
        <div className="border-t pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Order Items</h2>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div>
                  <span className="font-medium">{item.quantity}x</span> {item.menuItem?.name}
                </div>
                <div>৳{(item.unitPrice * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>৳{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">Delivery Address</h2>
          <div className="bg-gray-50 p-4 rounded-lg">{order.deliveryAddress}</div>
        </div>
      </div>
    </div>
  );
}