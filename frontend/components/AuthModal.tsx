// components/AuthModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  Briefcase,
  Truck,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { FaGoogle } from 'react-icons/fa';
import Image from 'next/image';
import { api } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
}: AuthModalProps) {
  const router = useRouter();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('customer');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
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
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: '',
  });

  // ESC + body scroll lock
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'login' ? 'login' : 'signup');
      setSelectedRole('customer');
      setForgotEmail('');
      setResetData({ token: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => firstInputRef.current?.focus(), 80);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await auth.login(loginData);
      if (!response.user || !response.token) {
        toast.error('Login failed: User data missing');
        return;
      }
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      await new Promise((r) => setTimeout(r, 80));
      window.dispatchEvent(new Event('auth-change'));
      toast.success('Welcome back!');
      onClose();
      const role = response.user.role;
      setTimeout(() => {
        if (role === 'admin') router.replace('/admin/dashboard');
        else if (role === 'owner') router.replace('/owner/dashboard');
        else if (role === 'agent') router.replace('/agent/dashboard');
        else router.replace('/');
      }, 200);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || error.message || 'Invalid credentials',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await auth.register(signupData);
      if (!response.user || !response.token) {
        toast.error('Registration failed');
        return;
      }
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      await new Promise((r) => setTimeout(r, 80));
      window.dispatchEvent(new Event('auth-change'));
      toast.success('Account created!');
      onClose();
      const role = response.user.role;
      setTimeout(() => {
        if (role === 'admin') router.replace('/admin/dashboard');
        else if (role === 'owner') router.replace('/owner/dashboard');
        else if (role === 'agent') router.replace('/agent/dashboard');
        else router.replace('/');
      }, 200);
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
      toast.success('Reset link sent to your email');
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
    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (resetData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token: resetData.token,
        newPassword: resetData.newPassword,
      });
      toast.success('Password reset successful');
      setMode('login');
      setResetData({ token: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-105 bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        {/* Back (forgot / reset) */}
        {(mode === 'forgot' || mode === 'reset') && (
          <button
            onClick={() => setMode('login')}
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-6">
          {/* Logo + Title */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 mb-4">
              <Image
                src="/logo.png"
                alt="QuickBite"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create account'}
              {mode === 'forgot' && 'Reset password'}
              {mode === 'reset' && 'New password'}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === 'login' && 'Sign in to continue to QuickBite'}
              {mode === 'signup' && 'Join QuickBite in under a minute'}
              {mode === 'forgot' && "We'll send you a reset link"}
              {mode === 'reset' && 'Choose a strong new password'}
            </p>
          </div>

          {/* Tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign up
              </button>
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={firstInputRef}
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          )}

          {/* ── SIGNUP ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              {/* Role pills */}
              <div className="grid grid-cols-3 gap-2 mb-1">
                {[
                  { id: 'customer', label: 'Order', emoji: '🍔' },
                  { id: 'owner', label: 'Partner', emoji: '🏪' },
                  { id: 'agent', label: 'Deliver', emoji: '🛵' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.id);
                      setSignupData({ ...signupData, role: r.id });
                    }}
                    className={`relative flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-medium transition ${
                      selectedRole === r.id
                        ? 'border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{r.emoji}</span>
                    {r.label}
                    {selectedRole === r.id && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={signupData.fullName}
                    onChange={(e) =>
                      setSignupData({ ...signupData, fullName: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e) =>
                      setSignupData({ ...signupData, email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={signupData.phone}
                    onChange={(e) =>
                      setSignupData({ ...signupData, phone: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                </div>
              </div>

              {/* Owner extra fields */}
              {selectedRole === 'owner' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-orange-500" />
                    Restaurant details
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="Restaurant name"
                    value={signupData.businessName}
                    onChange={(e) =>
                      setSignupData({ ...signupData, businessName: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Restaurant address"
                    value={signupData.businessAddress}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        businessAddress: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    Application reviewed within 2–3 business days
                  </div>
                </div>
              )}

              {/* Agent extra fields */}
              {selectedRole === 'agent' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-500" />
                    Delivery partner details
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="NID number"
                    value={signupData.nidNumber}
                    onChange={(e) =>
                      setSignupData({ ...signupData, nidNumber: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <select
                    required
                    value={signupData.vehicleType}
                    onChange={(e) =>
                      setSignupData({ ...signupData, vehicleType: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  >
                    <option value="">Vehicle type</option>
                    <option value="bike">Motorcycle</option>
                    <option value="scooter">Scooter</option>
                    <option value="car">Car</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Vehicle number plate"
                    value={signupData.vehicleNumber}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        vehicleNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Driving license number"
                    value={signupData.drivingLicense}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        drivingLicense: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    Verified within 3–5 business days
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : selectedRole === 'customer' ? (
                  'Create account'
                ) : selectedRole === 'owner' ? (
                  'Apply as Partner'
                ) : (
                  'Apply as Rider'
                )}
              </button>
            </form>
          )}

          {/* ── FORGOT ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-slate-500 text-center">
                Enter your email and we’ll send a reset link.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}

          {/* ── RESET ── */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Reset token
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste token from email"
                  value={resetData.token}
                  onChange={(e) =>
                    setResetData({ ...resetData, token: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  New password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={resetData.newPassword}
                  onChange={(e) =>
                    setResetData({ ...resetData, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Confirm password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat password"
                  value={resetData.confirmPassword}
                  onChange={(e) =>
                    setResetData({
                      ...resetData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>
          )}

          {/* Divider + Google */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-slate-400">
                    or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toast.success('Google sign-in coming soon')}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-sm font-medium text-slate-700"
              >
                <FaGoogle className="w-4 h-4 text-red-500" />
                Google
              </button>
            </>
          )}

          {/* Terms */}
          {(mode === 'login' || mode === 'signup') && (
            <p className="text-center text-[11px] text-slate-400 mt-6 leading-relaxed">
              By continuing you agree to our{' '}
              <a href="#" className="text-orange-600 hover:underline">
                Terms
              </a>{' '}
              and{' '}
              <a href="#" className="text-orange-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}