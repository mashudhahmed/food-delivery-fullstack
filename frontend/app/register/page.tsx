'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../lib/auth';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('customer');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'customer',
    businessName: '',
    businessAddress: '',
    taxId: '',
    nidNumber: '',
    vehicleType: '',
    vehicleNumber: '',
    drivingLicense: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await auth.register(formData) as { token: any; user: any; requiresApproval?: boolean };
      
      if (response.requiresApproval) {
        toast.success('Application submitted! We will review and notify you via email.');
        router.push('/pending-approval');
      } else {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('Registration successful!');
        router.push('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join QuickBite
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already a member?{' '}
            <Link href="/login" className="font-medium text-orange-600 hover:text-orange-500">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <input
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <input
                type="tel"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <input
                type="text"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Address (optional)"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to:
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    name="role"
                    value="customer"
                    checked={selectedRole === 'customer'}
                    onChange={() => {
                      setSelectedRole('customer');
                      setFormData({ ...formData, role: 'customer' });
                    }}
                    className="mt-1 w-4 h-4 text-orange-500"
                  />
                  <div>
                    <p className="font-medium text-gray-800">Order Food</p>
                    <p className="text-sm text-gray-500">Browse and order from hundreds of restaurants</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    name="role"
                    value="owner"
                    checked={selectedRole === 'owner'}
                    onChange={() => {
                      setSelectedRole('owner');
                      setFormData({ ...formData, role: 'owner' });
                    }}
                    className="mt-1 w-4 h-4 text-orange-500"
                  />
                  <div>
                    <p className="font-medium text-gray-800">Partner with us</p>
                    <p className="text-sm text-gray-500">List your restaurant and reach more customers</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    name="role"
                    value="agent"
                    checked={selectedRole === 'agent'}
                    onChange={() => {
                      setSelectedRole('agent');
                      setFormData({ ...formData, role: 'agent' });
                    }}
                    className="mt-1 w-4 h-4 text-orange-500"
                  />
                  <div>
                    <p className="font-medium text-gray-800">Become a Delivery Partner</p>
                    <p className="text-sm text-gray-500">Earn money by delivering food</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Restaurant Owner Fields */}
            {selectedRole === 'owner' && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-gray-800">Restaurant Information</h3>
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Restaurant/Business Name"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Restaurant Address"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                />
                <input
                  type="text"
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Tax ID / Business Registration (optional)"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
                <p className="text-xs text-gray-500">* We'll review your application within 2-3 business days</p>
              </div>
            )}

            {/* Delivery Agent Fields */}
            {selectedRole === 'agent' && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-gray-800">Delivery Partner Information</h3>
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="NID Number"
                  value={formData.nidNumber}
                  onChange={(e) => setFormData({ ...formData, nidNumber: e.target.value })}
                />
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Driving License Number"
                  value={formData.drivingLicense}
                  onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.value })}
                />
                <select
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                >
                  <option value="">Select Vehicle Type</option>
                  <option value="bike">Motorcycle</option>
                  <option value="scooter">Scooter</option>
                  <option value="car">Car</option>
                </select>
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Vehicle Number Plate"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                />
                <p className="text-xs text-gray-500">* We'll verify your documents and get back to you within 3-5 business days</p>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {loading 
                ? 'Submitting...' 
                : selectedRole === 'customer' 
                  ? 'Create Account' 
                  : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}