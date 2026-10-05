'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { auth, type RegisterData } from '@/lib/auth';
import { getUserFriendlyError, logError } from '@/lib/error-handler';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { FaGoogle } from 'react-icons/fa';
import Image from 'next/image';
import { api } from '@/lib/api';

// ==================== TYPES ====================
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: 'customer' | 'owner' | 'agent';
  businessName: string;
  businessAddress: string;
  taxId: string;
  nidNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  drivingLicense: string;
}

// ==================== INITIAL STATES ====================
const initialSignupData: SignupFormData = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'customer',
  businessName: '',
  businessAddress: '',
  taxId: '',
  nidNumber: '',
  vehicleType: '',
  vehicleNumber: '',
  drivingLicense: '',
};

// ==================== COMPONENT ====================
export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
}: AuthModalProps) {
  const router = useRouter();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);
  const isMounted = useRef(true);

  // ===== State =====
  const [isClient, setIsClient] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset' | '2fa'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'owner' | 'agent'>('customer');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState<SignupFormData>(initialSignupData);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: '',
  });

  // ===== 2FA State =====
  const [tempToken, setTempToken] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');

  // ===== Cleanup on unmount =====
  useEffect(() => {
    isMounted.current = true;
    setIsClient(true);
    return () => {
      isMounted.current = false;
      setLoading(false);
    };
  }, []);

  // ===== Reset state when modal opens =====
  useLayoutEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'unset';
      return;
    }

    document.body.style.overflow = 'hidden';

    if (isFirstRender.current || initialMode === 'login') {
      const newMode = initialMode === 'login' ? 'login' : 'signup';
      setMode(newMode);
      setSelectedRole('customer');
      setSignupData(initialSignupData);
      setForgotEmail('');
      setResetData({ token: '', newPassword: '', confirmPassword: '' });
      setLoginData({ email: '', password: '' });
      setLoading(false);
      setTempToken('');
      setTwoFactorToken('');
      isFirstRender.current = false;
    }

    setTimeout(() => firstInputRef.current?.focus(), 80);

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialMode]);

  // ===== ESC key =====
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // ==================== LOGIN HANDLER ====================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    if (!loginData.email || !loginData.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await auth.login(loginData);

      if (!isMounted.current) return;

      // Check if 2FA is required
      if (response.requiresTwoFactor) {
        setMode('2fa');
        setTempToken(response.tempToken || '');
        setLoading(false);
        return;
      }

      if (!response.user || !response.token) {
        toast.error('Login failed: Invalid response from server');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      await new Promise((r) => setTimeout(r, 80));
      window.dispatchEvent(new Event('auth-change'));

      toast.success('Welcome back!');
      onClose();

      const role = response.user.role;
      const redirectMap: Record<string, string> = {
        admin: '/admin/dashboard',
        owner: '/owner/dashboard',
        agent: '/agent/dashboard',
      };
      if (role !== 'customer' && redirectMap[role]) {
        setTimeout(() => router.replace(redirectMap[role]), 200);
      } else if (
        typeof window !== 'undefined' &&
        (window.location.pathname === '/login' ||
          window.location.pathname === '/register')
      ) {
        setTimeout(() => router.replace('/'), 200);
      }

      setLoading(false);
    } catch (error) {
      if (!isMounted.current) return;
      logError(error, 'AuthModal.login');
      toast.error(getUserFriendlyError(error));
      setLoading(false);
    }
  };

  // ==================== 2FA VERIFICATION ====================
  const handle2FAVerification = async () => {
    if (!twoFactorToken.trim()) {
      toast.error('Please enter your 2FA code');
      return;
    }

    if (twoFactorToken.length !== 6 || !/^\d{6}$/.test(twoFactorToken)) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login/2fa', {
        tempToken,
        token: twoFactorToken,
      });

      const { accessToken, refreshToken, user } = response.data?.data || response.data;

      if (!accessToken || !user) {
        toast.error('Invalid response from server');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      window.dispatchEvent(new Event('auth-change'));
      toast.success('Login successful!');
      onClose();

      const redirectMap: Record<string, string> = {
        admin: '/admin/dashboard',
        owner: '/owner/dashboard',
        agent: '/agent/dashboard',
      };
      if (user.role !== 'customer' && redirectMap[user.role]) {
        setTimeout(() => router.replace(redirectMap[user.role]), 200);
      } else if (
        typeof window !== 'undefined' &&
        (window.location.pathname === '/login' ||
          window.location.pathname === '/register')
      ) {
        setTimeout(() => router.replace('/'), 200);
      }
    } catch (error) {
      toast.error('Invalid 2FA code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== SIGNUP HANDLER ====================
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    // Required fields
    if (!signupData.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!signupData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!signupData.password) {
      toast.error('Password is required');
      return;
    }
    if (!signupData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(signupData.password)) {
      toast.error(
        'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)',
      );
      return;
    }

    // Bangladeshi phone
    const phoneRegex = /^(\+8801|01)[3-9]\d{8}$/;
    if (!phoneRegex.test(signupData.phone)) {
      toast.error('Please enter a valid Bangladeshi phone number (01XXXXXXXXX)');
      return;
    }

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Owner extra validation
    if (signupData.role === 'owner') {
      if (!signupData.businessName.trim()) {
        toast.error('Restaurant name is required');
        return;
      }
      if (!signupData.businessAddress.trim()) {
        toast.error('Restaurant address is required');
        return;
      }
    }

    // Agent extra validation
    if (signupData.role === 'agent') {
      if (!signupData.nidNumber.trim()) {
        toast.error('NID number is required');
        return;
      }
      if (!signupData.vehicleType) {
        toast.error('Vehicle type is required');
        return;
      }
      if (!signupData.vehicleNumber.trim()) {
        toast.error('Vehicle number is required');
        return;
      }
      if (!signupData.drivingLicense.trim()) {
        toast.error('Driving license is required');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: RegisterData = {
        fullName: signupData.fullName.trim(),
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
        phone: signupData.phone.trim(),
        role: signupData.role,
      };

      if (signupData.role === 'owner') {
        payload.businessName = signupData.businessName.trim();
        payload.businessAddress = signupData.businessAddress.trim();
        if (signupData.taxId) payload.taxId = signupData.taxId.trim();
      }

      if (signupData.role === 'agent') {
        payload.nidNumber = signupData.nidNumber.trim();
        payload.vehicleType = signupData.vehicleType;
        payload.vehicleNumber = signupData.vehicleNumber.trim();
        payload.drivingLicense = signupData.drivingLicense.trim();
      }

      const response = await auth.register(payload);

      if (!isMounted.current) return;

      // Safety check
      if (!response?.user) {
        toast.error('Registration failed: Invalid response from server');
        setLoading(false);
        return;
      }

      // ===== Owner / Agent → needs admin approval =====
      if (response.requiresApproval) {
        toast.success(
          response.message ||
            'Application submitted! Please wait for admin approval.',
        );
        onClose();
        router.push('/pending-approval');
        setLoading(false);
        return;
      }

      // ===== Customer → auto login =====
      if (response.token || response.accessToken) {
        localStorage.setItem(
          'token',
          (response.token || response.accessToken) as string,
        );
      }

      localStorage.setItem('user', JSON.stringify(response.user));

      await new Promise((r) => setTimeout(r, 80));
      window.dispatchEvent(new Event('auth-change'));

      toast.success(response.message || 'Account created successfully!');
      onClose();

      const role = response.user.role;
      const redirectMap: Record<string, string> = {
        admin: '/admin/dashboard',
        owner: '/owner/dashboard',
        agent: '/agent/dashboard',
      };
      if (role !== 'customer' && redirectMap[role]) {
        setTimeout(() => router.replace(redirectMap[role]), 200);
      } else if (
        typeof window !== 'undefined' &&
        (window.location.pathname === '/login' ||
          window.location.pathname === '/register')
      ) {
        setTimeout(() => router.replace('/'), 200);
      }

      setLoading(false);
    } catch (error) {
      if (!isMounted.current) return;

      // ✅ FIXED: Correctly extract the error message from the AxiosError
      let message = 'Registration failed';

      // Type guard to safely access nested response data
      const isAxiosError = (err: any): err is { response?: { data?: { message?: string | string[] } } } => {
        return err && typeof err === 'object' && 'response' in err;
      };

      if (isAxiosError(error) && error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          message = error.response.data.message.join(', ');
        } else {
          message = error.response.data.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast.error(message);
      setLoading(false);
    }
  };

  // ==================== FORGOT PASSWORD ====================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    if (!forgotEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      toast.success('Reset link sent to your email');
      setMode('login');
      setForgotEmail('');
    } catch (error) {
      if (!isMounted.current) return;
      logError(error, 'AuthModal.forgotPassword');
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  // ==================== RESET PASSWORD ====================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (resetData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!resetData.token.trim()) {
      toast.error('Reset token is required');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token: resetData.token.trim(),
        newPassword: resetData.newPassword,
      });
      toast.success('Password reset successful');
      setMode('login');
      setResetData({ token: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      if (!isMounted.current) return;
      logError(error, 'AuthModal.resetPassword');
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDER HELPERS =====
  const handleRoleSelect = useCallback(
    (role: 'customer' | 'owner' | 'agent') => {
      setSelectedRole(role);
      setSignupData((prev) => ({ ...prev, role }));
    },
    [],
  );

  const handleSignupChange = useCallback(
    <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => {
      setSignupData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  if (!isOpen || !isClient) return null;

  // ==================== RENDER ====================
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

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

        {/* Back button for forgot/reset/2fa */}
        {(mode === 'forgot' || mode === 'reset' || mode === '2fa') && (
          <button
            onClick={() => {
              setMode('login');
              setTempToken('');
              setTwoFactorToken('');
            }}
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
        )}

        {/* Body */}
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
              {mode === '2fa' && 'Two-Factor Authentication'}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === 'login' && 'Sign in to continue to QuickBite'}
              {mode === 'signup' && 'Join QuickBite in under a minute'}
              {mode === 'forgot' && "We'll send you a reset link"}
              {mode === 'reset' && 'Choose a strong new password'}
              {mode === '2fa' && 'Enter the 6-digit code from your authenticator app'}
            </p>
          </div>

          {/* Tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${(
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}`}
              >
                Log in
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${(
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}`}
              >
                Sign up
              </button>
            </div>
          )}

          {/* ===== LOGIN ===== */}
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

          {/* ===== 2FA VERIFICATION ===== */}
          {mode === '2fa' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  autoFocus
                />
              </div>

              <button
                onClick={handle2FAVerification}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>
            </div>
          )}

          {/* ===== SIGNUP ===== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              {/* Role Pills */}
              <div className="grid grid-cols-3 gap-2 mb-1">
                {[
                  { id: 'customer' as const, label: 'Order', emoji: '🍔' },
                  { id: 'owner' as const, label: 'Partner', emoji: '🏪' },
                  { id: 'agent' as const, label: 'Deliver', emoji: '🛵' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleSelect(r.id)}
                    className={`relative flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-medium transition ${(
                      selectedRole === r.id
                        ? 'border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}`}
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

              {/* Full Name */}
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
                      handleSignupChange('fullName', e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                </div>
              </div>

              {/* Email */}
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
                    onChange={(e) => handleSignupChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min 8 chars with uppercase, lowercase, number, special"
                    value={signupData.password}
                    onChange={(e) =>
                      handleSignupChange('password', e.target.value)
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
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Must contain uppercase, lowercase, number, and special
                  character (@$!%*?&)
                </p>
              </div>

              {/* Phone */}
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
                    onChange={(e) => handleSignupChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                </div>
              </div>

              {/* Owner Extra Fields */}
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
                      handleSignupChange('businessName', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Restaurant address"
                    value={signupData.businessAddress}
                    onChange={(e) =>
                      handleSignupChange('businessAddress', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    Application reviewed within 2–3 business days
                  </div>
                </div>
              )}

              {/* Agent Extra Fields */}
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
                      handleSignupChange('nidNumber', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <select
                    required
                    value={signupData.vehicleType}
                    onChange={(e) =>
                      handleSignupChange('vehicleType', e.target.value)
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
                      handleSignupChange('vehicleNumber', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Driving license number"
                    value={signupData.drivingLicense}
                    onChange={(e) =>
                      handleSignupChange('drivingLicense', e.target.value)
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

          {/* ===== FORGOT PASSWORD ===== */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-slate-500 text-center">
                Enter your email and we&apos;ll send a reset link.
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

          {/* ===== RESET PASSWORD ===== */}
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
                  minLength={8}
                  placeholder="Min 8 characters"
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

          {/* ===== DIVIDER + GOOGLE ===== */}
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

          {/* ===== TERMS ===== */}
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
    </div>,
    document.body
  );
}