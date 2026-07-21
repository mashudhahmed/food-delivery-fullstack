'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, Briefcase, Truck, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { FaFacebook, FaGoogle, FaMapPin } from 'react-icons/fa';
import { SiApple } from 'react-icons/si';
import Image from 'next/image';
import { api } from '@/lib/api';

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-md mx-auto overflow-hidden shadow-xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition z-10"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </button>

        {/* Back button for forgot/reset modes */}
        {(mode === 'forgot' || mode === 'reset') && (
          <button
            onClick={() => setMode('login')}
            className="absolute top-4 left-4 p-1 hover:bg-gray-100 rounded-full transition z-10"
            aria-label="Go back to login"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </button>
        )}

        {/* Scrollable Content */}
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="p-6 pt-8">
            {/* Logo */}
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
              <h1 id="auth-modal-title" className="text-3xl font-bold text-orange-500">QuickBite</h1>
              <p className="text-sm text-gray-500 mt-2">
                {mode === 'login' && 'Welcome back! Sign in to continue'}
                {mode === 'signup' && 'Create your account to get started'}
                {mode === 'forgot' && 'Reset your password'}
                {mode === 'reset' && 'Create new password'}
              </p>
            </div>

            {/* Mode Toggle - Only for login/signup */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="flex gap-2 bg-gray-100 rounded-full p-1 mb-6" role="tablist">
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
                    mode === 'login'
                      ? 'bg-white text-orange-500 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  role="tab"
                  aria-selected={mode === 'login'}
                  aria-controls="login-panel"
                  id="login-tab"
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
                  role="tab"
                  aria-selected={mode === 'signup'}
                  aria-controls="signup-panel"
                  id="signup-tab"
                >
                  Sign up
                </button>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4" id="login-panel" role="tabpanel" aria-labelledby="login-tab">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      aria-required="true"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      aria-required="true"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-orange-500 hover:text-orange-600 text-right w-full"
                  aria-label="Forgot password"
                >
                  Forgot password?
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                  aria-busy={loading}
                >
                  {loading ? 'Logging in...' : 'Log in'}
                </button>
              </form>
            )}

            {/* Signup Form with Role Selection */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3" id="signup-panel" role="tabpanel" aria-labelledby="signup-tab">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="signup-name"
                      type="text"
                      required
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      aria-required="true"
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      aria-required="true"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Create a password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      aria-required="true"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="signup-phone"
                      type="tel"
                      required
                      placeholder="Enter your phone number"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                      aria-required="true"
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <div className="relative">
                    <FaMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="signup-address"
                      type="text"
                      placeholder="Enter your address (optional)"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={signupData.address}
                      onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                      autoComplete="street-address"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-medium text-gray-700">
                    I want to:
                  </label>
                  <div className="space-y-2" role="radiogroup" aria-label="Account type">
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
                        aria-label="Order Food"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Order Food</p>
                        <p className="text-xs text-gray-500">Browse and order from restaurants</p>
                      </div>
                      <span className="text-2xl" aria-hidden="true">🍔</span>
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
                        aria-label="Partner with us"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Partner with us</p>
                        <p className="text-xs text-gray-500">List your restaurant and reach more customers</p>
                      </div>
                      <span className="text-2xl" aria-hidden="true">🏪</span>
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
                        aria-label="Become a Delivery Partner"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Become a Delivery Partner</p>
                        <p className="text-xs text-gray-500">Earn money by delivering food</p>
                      </div>
                      <span className="text-2xl" aria-hidden="true">🛵</span>
                    </label>
                  </div>
                </div>

                {/* Restaurant Owner Fields */}
                {selectedRole === 'owner' && (
                  <div className="space-y-3 border-t pt-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-orange-500" aria-hidden="true" />
                      Restaurant Information
                    </h3>
                    <div>
                      <label htmlFor="owner-business-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant/Business Name <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="owner-business-name"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter restaurant name"
                        value={signupData.businessName}
                        onChange={(e) => setSignupData({ ...signupData, businessName: e.target.value })}
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="owner-business-address" className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant Address <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="owner-business-address"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter restaurant address"
                        value={signupData.businessAddress}
                        onChange={(e) => setSignupData({ ...signupData, businessAddress: e.target.value })}
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="owner-tax-id" className="block text-sm font-medium text-gray-700 mb-1">
                        Tax ID (optional)
                      </label>
                      <input
                        id="owner-tax-id"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter tax ID"
                        value={signupData.taxId}
                        onChange={(e) => setSignupData({ ...signupData, taxId: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      <span>Your application will be reviewed within 2-3 business days</span>
                    </div>
                  </div>
                )}

                {/* Delivery Agent Fields */}
                {selectedRole === 'agent' && (
                  <div className="space-y-3 border-t pt-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500" aria-hidden="true" />
                      Delivery Partner Information
                    </h3>
                    <div>
                      <label htmlFor="agent-nid" className="block text-sm font-medium text-gray-700 mb-1">
                        NID Number <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="agent-nid"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter NID number"
                        value={signupData.nidNumber}
                        onChange={(e) => setSignupData({ ...signupData, nidNumber: e.target.value })}
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="agent-vehicle-type" className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Type <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <select
                        id="agent-vehicle-type"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        value={signupData.vehicleType}
                        onChange={(e) => setSignupData({ ...signupData, vehicleType: e.target.value })}
                        aria-required="true"
                      >
                        <option value="">Select Vehicle Type</option>
                        <option value="bike">Motorcycle</option>
                        <option value="scooter">Scooter</option>
                        <option value="car">Car</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="agent-vehicle-number" className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Number Plate <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="agent-vehicle-number"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter vehicle number"
                        value={signupData.vehicleNumber}
                        onChange={(e) => setSignupData({ ...signupData, vehicleNumber: e.target.value })}
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label htmlFor="agent-license" className="block text-sm font-medium text-gray-700 mb-1">
                        Driving License Number <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="agent-license"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="Enter driving license number"
                        value={signupData.drivingLicense}
                        onChange={(e) => setSignupData({ ...signupData, drivingLicense: e.target.value })}
                        aria-required="true"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      <span>Your application will be verified within 3-5 business days</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                  aria-busy={loading}
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
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      aria-required="true"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                  aria-busy={loading}
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
                  <label htmlFor="reset-token" className="block text-sm font-medium text-gray-700 mb-1">
                    Reset Token <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="reset-token"
                      type="text"
                      required
                      placeholder="Enter reset token"
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={resetData.token}
                      onChange={(e) => setResetData({ ...resetData, token: e.target.value })}
                      aria-required="true"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reset-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                      aria-required="true"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                    <input
                      id="reset-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                      aria-required="true"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50"
                  aria-busy={loading}
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

                {/* Social Login */}
                <div className="space-y-2">
                  <button 
                    onClick={() => handleSocialLogin('Google')}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                    aria-label="Continue with Google"
                  >
                    <FaGoogle className="w-5 h-5 text-red-500" aria-hidden="true" />
                    <span className="text-sm font-medium text-gray-700">Continue with Google</span>
                  </button>
                  
                  <button 
                    onClick={() => handleSocialLogin('Facebook')}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                    aria-label="Continue with Facebook"
                  >
                    <FaFacebook className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    <span className="text-sm font-medium text-gray-700">Continue with Facebook</span>
                  </button>
                  
                  <button 
                    onClick={() => handleSocialLogin('Apple')}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                    aria-label="Continue with Apple"
                  >
                    <SiApple className="w-5 h-5 text-gray-800" aria-hidden="true" />
                    <span className="text-sm font-medium text-gray-700">Continue with Apple</span>
                  </button>
                </div>
              </>
            )}

            {/* Terms - Only for login/signup */}
            {(mode === 'login' || mode === 'signup') && (
              <p className="text-center text-xs text-gray-400 mt-6">
                By continuing, you agree to our{' '}
                <a href="#" className="text-orange-500 hover:underline" aria-label="Terms of Service">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="text-orange-500 hover:underline" aria-label="Privacy Policy">Privacy Policy</a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}