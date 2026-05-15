'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, Briefcase, Truck, AlertCircle } from 'lucide-react';
import { auth } from '@/app/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { FaFacebook, FaGoogle, FaMapPin } from 'react-icons/fa';
import { SiApple } from 'react-icons/si';
import Image from 'next/image';
import { api } from '@/app/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('customer');
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  
  // Signup form state
  const [signupData, setSignupData] = useState({
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

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'login' ? 'login' : 'signup');
      setSelectedRole('customer');
      setForgotEmail('');
      setResetData({ token: '', newPassword: '', confirmPassword: '' });
    }
  }, [isOpen, initialMode]);

  // Prevent body scroll
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await auth.login(loginData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      window.dispatchEvent(new Event('auth-change'));
      
      toast.success('Login successful!');
      onClose();
      
      const userRole = response.user.role;
      switch (userRole) {
        case 'admin': router.push('/admin/dashboard'); break;
        case 'owner': router.push('/owner/dashboard'); break;
        case 'agent': router.push('/agent/dashboard'); break;
        default: router.push('/'); break;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await auth.register(signupData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      window.dispatchEvent(new Event('auth-change'));
      
      toast.success('Registration successful!');
      onClose();
      
      const userRole = response.user.role;
      switch (userRole) {
        case 'admin': router.push('/admin/dashboard'); break;
        case 'owner': router.push('/owner/dashboard'); break;
        case 'agent': router.push('/agent/dashboard'); break;
        default: router.push('/'); break;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Reset link sent to your email!');
      setMode('login');
      setForgotEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (resetData.newPassword !== resetData.confirmPassword) {
        toast.error('Passwords do not match');
        setLoading(false);
        return;
      }
      if (resetData.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      await api.post('/auth/reset-password', {
        token: resetData.token,
        newPassword: resetData.newPassword,
      });
      toast.success('Password reset successful! Please login.');
      setMode('login');
      setResetData({ token: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast.success(`Connecting with ${provider}...`);
    // Add your social login logic here
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-200 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-md mx-auto overflow-hidden shadow-xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Back button for forgot/reset modes */}
        {(mode === 'forgot' || mode === 'reset') && (
          <button
            onClick={() => setMode('login')}
            className="absolute top-4 left-4 p-1 hover:bg-gray-100 rounded-full transition z-10"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
        )}

        {/* Scrollable Content */}
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="p-6 pt-8">
            {/* Logo - Clean, Big, Visible, No Orange Box */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Image 
                  src="/logo.png" 
                  alt="QuickBite" 
                  width={64} 
                  height={64} 
                  className="w-16 h-16 object-contain"
                  priority
                />
              </div>
              <div className="text-3xl font-bold text-orange-500">QuickBite</div>
              <p className="text-sm text-gray-500 mt-2">
                {mode === 'login' && 'Welcome back! Sign in to continue'}
                {mode === 'signup' && 'Create your account to get started'}
                {mode === 'forgot' && 'Reset your password'}
                {mode === 'reset' && 'Create new password'}
              </p>
            </div>

            {/* Mode Toggle - Only for login/signup */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="flex gap-2 bg-gray-100 rounded-full p-1 mb-6">
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
                    mode === 'login'
                      ? 'bg-white text-orange-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Log in
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
                    mode === 'signup'
                      ? 'bg-white text-orange-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Sign up
                </button>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="Email address"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-orange-500 hover:text-orange-600 text-right w-full"
                >
                  Forgot password?
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Log in'}
                </button>
              </form>
            )}

            {/* Signup Form with Role Selection */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <FaMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Address (optional)"
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    value={signupData.address}
                    onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                  />
                </div>

                {/* Role Selection */}
                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-medium text-gray-700">
                    I want to:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-orange-50 transition">
                      <input
                        type="radio"
                        name="role"
                        value="customer"
                        checked={selectedRole === 'customer'}
                        onChange={() => {
                          setSelectedRole('customer');
                          setSignupData({ ...signupData, role: 'customer' });
                        }}
                        className="w-4 h-4 text-orange-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Order Food</p>
                        <p className="text-xs text-gray-500">Browse and order from restaurants</p>
                      </div>
                      <span className="text-2xl">🍔</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-orange-50 transition">
                      <input
                        type="radio"
                        name="role"
                        value="owner"
                        checked={selectedRole === 'owner'}
                        onChange={() => {
                          setSelectedRole('owner');
                          setSignupData({ ...signupData, role: 'owner' });
                        }}
                        className="w-4 h-4 text-orange-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Partner with us</p>
                        <p className="text-xs text-gray-500">List your restaurant and reach more customers</p>
                      </div>
                      <span className="text-2xl">🏪</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-orange-50 transition">
                      <input
                        type="radio"
                        name="role"
                        value="agent"
                        checked={selectedRole === 'agent'}
                        onChange={() => {
                          setSelectedRole('agent');
                          setSignupData({ ...signupData, role: 'agent' });
                        }}
                        className="w-4 h-4 text-orange-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Become a Delivery Partner</p>
                        <p className="text-xs text-gray-500">Earn money by delivering food</p>
                      </div>
                      <span className="text-2xl">🛵</span>
                    </label>
                  </div>
                </div>

                {/* Restaurant Owner Fields */}
                {selectedRole === 'owner' && (
                  <div className="space-y-3 border-t pt-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-orange-500" />
                      Restaurant Information
                    </h3>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Restaurant/Business Name"
                      value={signupData.businessName}
                      onChange={(e) => setSignupData({ ...signupData, businessName: e.target.value })}
                    />
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Restaurant Address"
                      value={signupData.businessAddress}
                      onChange={(e) => setSignupData({ ...signupData, businessAddress: e.target.value })}
                    />
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Tax ID (optional)"
                      value={signupData.taxId}
                      onChange={(e) => setSignupData({ ...signupData, taxId: e.target.value })}
                    />
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span>Your application will be reviewed within 2-3 business days</span>
                    </div>
                  </div>
                )}

                {/* Delivery Agent Fields */}
                {selectedRole === 'agent' && (
                  <div className="space-y-3 border-t pt-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500" />
                      Delivery Partner Information
                    </h3>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="NID Number"
                      value={signupData.nidNumber}
                      onChange={(e) => setSignupData({ ...signupData, nidNumber: e.target.value })}
                    />
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      value={signupData.vehicleType}
                      onChange={(e) => setSignupData({ ...signupData, vehicleType: e.target.value })}
                    >
                      <option value="">Select Vehicle Type</option>
                      <option value="bike">Motorcycle</option>
                      <option value="scooter">Scooter</option>
                      <option value="car">Car</option>
                    </select>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Vehicle Number Plate"
                      value={signupData.vehicleNumber}
                      onChange={(e) => setSignupData({ ...signupData, vehicleNumber: e.target.value })}
                    />
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Driving License Number"
                      value={signupData.drivingLicense}
                      onChange={(e) => setSignupData({ ...signupData, drivingLicense: e.target.value })}
                    />
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span>Your application will be verified within 3-5 business days</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 
                    (selectedRole === 'customer' ? 'Sign up' : 
                     selectedRole === 'owner' ? 'Apply as Restaurant' : 'Apply as Delivery Partner')}
                </button>
              </form>
            )}

            {/* Forgot Password Form */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="Email address"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            {/* Reset Password Form */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Create a new password for your account.
                </p>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="Reset Token"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={resetData.token}
                      onChange={(e) => setResetData({ ...resetData, token: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="New Password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm New Password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            {/* Divider - Only for login/signup */}
            {(mode === 'login' || mode === 'signup') && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or continue with</span>
                  </div>
                </div>

                {/* Social Login - Industry Standard Logos */}
                <div className="space-y-2">
                  <button 
                    onClick={() => handleSocialLogin('Google')}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <FaGoogle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">Continue with Google</span>
                  </button>
                  
                  <button 
                    onClick={() => handleSocialLogin('Facebook')}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <FaFacebook className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Continue with Facebook</span>
                  </button>
                  
                  <button 
                    onClick={() => handleSocialLogin('Apple')}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <SiApple className="w-5 h-5 text-gray-800" />
                    <span className="text-sm font-medium text-gray-700">Continue with Apple</span>
                  </button>
                </div>
              </>
            )}

            {/* Terms - Only for login/signup */}
            {(mode === 'login' || mode === 'signup') && (
              <p className="text-center text-xs text-gray-400 mt-6">
                By continuing, you agree to our{' '}
                <a href="#" className="text-orange-500 hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="text-orange-500 hover:underline">Privacy Policy</a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}