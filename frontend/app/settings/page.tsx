'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  Bell,
  Lock,
  Globe,
  MapPin,
  CreditCard,
  Heart,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  Volume2,
  VolumeX,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Loader2,
  AlertTriangle,
  KeyRound,
  Shield,
  Store,
} from 'lucide-react';
import { auth, AuthUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { useAddressStore } from '@/stores/addressStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import toast from 'react-hot-toast';
import { showErrorToast } from '@/lib/error-handler';
import LogoutModal from '@/components/LogoutModal';

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Display Picture (DP) State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notification Preferences State (Matches backend UpdateNotificationPreferencesDto)
  const [notificationPrefs, setNotificationPrefs] = useState({
    inAppOrderStatus: true,
    inAppDeliveryUpdate: true,
    inAppPromotional: false,
    inAppReview: true,
    inAppNewOrder: true,
    inAppEarnings: true,

    emailOrderStatus: true,
    emailDeliveryUpdate: true,
    emailPromotional: false,
    emailReview: true,
    emailNewOrder: true,
    emailEarnings: true,

    pushOrderStatus: true,
    pushDeliveryUpdate: true,
    pushPromotional: false,
    pushReview: true,
    pushNewOrder: true,
    pushEarnings: true,
  });

  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    showProfile: true,
    twoFactorAuth: false,
  });

  const [appearance, setAppearance] = useState({
    theme: 'light',
    language: 'en',
    currency: 'BDT',
  });

  const [sound, setSound] = useState({
    soundsEnabled: true,
    volume: 70,
  });

  // Modal States
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Track pristine/dirty profile form state
  const isProfileDirty =
    fullName !== (user?.fullName || '') ||
    phone !== (user?.phone || '') ||
    address !== (user?.address || '');

  // Calculate password strength score
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Role-based navigation tabs
  const getSections = () => {
    const baseSections = [
      { id: 'profile', label: 'Profile & Avatar', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'privacy', label: 'Security & Password', icon: Lock },
      { id: 'appearance', label: 'Appearance & Region', icon: Globe },
      { id: 'support', label: 'Support & Help', icon: HelpCircle },
    ];

    if (user?.role !== 'admin') {
      baseSections.splice(1, 0, { id: 'addresses', label: 'Saved Addresses', icon: MapPin });
      baseSections.splice(2, 0, { id: 'payment', label: 'Payment Methods', icon: CreditCard });
      baseSections.splice(3, 0, { id: 'favorites', label: 'Favorites', icon: Heart });
    }

    return baseSections;
  };

  // Auth check & load preferences
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const authenticated = auth.isAuthenticated();

      if (!authenticated) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setLoading(false);
        }
        router.push('/login');
        return;
      }

      const currentUser = auth.getCurrentUser();

      if (!cancelled) {
        setIsAuthenticated(true);
        setUser(currentUser);
        setFullName(currentUser?.fullName || currentUser?.name || '');
        setPhone(currentUser?.phone || '');
        setAddress(currentUser?.address || '');
      }

      // Fetch notification preferences
      try {
        const res = await api.get('/users/me/notification-preferences');
        const data = res.data?.data || res.data;
        if (data && !cancelled) {
          setNotificationPrefs({
            inAppOrderStatus: data.inAppOrderStatus ?? true,
            inAppDeliveryUpdate: data.inAppDeliveryUpdate ?? true,
            inAppPromotional: data.inAppPromotional ?? false,
            inAppReview: data.inAppReview ?? true,
            inAppNewOrder: data.inAppNewOrder ?? true,
            inAppEarnings: data.inAppEarnings ?? true,

            emailOrderStatus: data.emailOrderStatus ?? true,
            emailDeliveryUpdate: data.emailDeliveryUpdate ?? true,
            emailPromotional: data.emailPromotional ?? false,
            emailReview: data.emailReview ?? true,
            emailNewOrder: data.emailNewOrder ?? true,
            emailEarnings: data.emailEarnings ?? true,

            pushOrderStatus: data.pushOrderStatus ?? true,
            pushDeliveryUpdate: data.pushDeliveryUpdate ?? true,
            pushPromotional: data.pushPromotional ?? false,
            pushReview: data.pushReview ?? true,
            pushNewOrder: data.pushNewOrder ?? true,
            pushEarnings: data.pushEarnings ?? true,
          });
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Read URL ?tab= parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      queueMicrotask(() => setActiveSection(tab));
    }
  }, []);

  // Role-based section guard
  useEffect(() => {
    if (user?.role === 'admin') {
      const restrictedSections = ['addresses', 'payment', 'favorites'];
      if (restrictedSections.includes(activeSection)) {
        queueMicrotask(() => {
          setActiveSection('profile');
          toast('This section is not available for your account type.');
        });
      }
    }
  }, [activeSection, user]);

  // Sync with global auth-change events
  useEffect(() => {
    const handleAuthChange = () => {
      const updatedUser = auth.getCurrentUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // Confirm logout
  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    await auth.logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  // Upload Display Picture (Cloudinary)
  const processImageFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a valid JPG, PNG, or WebP image');
      return;
    }

    // Immediate optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedData = response.data?.data || response.data;
      const secureUrl = updatedData?.profilePicture || updatedData?.secureUrl || updatedData?.url;

      if (secureUrl) {
        auth.updateCurrentUser({ profilePicture: secureUrl });
        setUser((prev) => (prev ? { ...prev, profilePicture: secureUrl } : null));
        setPhotoPreview(null);
        toast.success('Profile picture updated and synced across the app!');
      } else {
        setPhotoPreview(null);
        toast.error('Could not retrieve uploaded image URL.');
      }
    } catch (error: unknown) {
      setPhotoPreview(null);
      showErrorToast(error, 'Failed to upload profile picture');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  // Remove Display Picture
  const handleRemoveProfilePicture = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;

    setRemovingPhoto(true);
    try {
      await api.delete('/users/me/profile-picture');
      auth.updateCurrentUser({ profilePicture: undefined });
      setUser((prev) => (prev ? { ...prev, profilePicture: undefined } : null));
      setPhotoPreview(null);
      toast.success('Profile picture removed successfully');
    } catch (error: unknown) {
      showErrorToast(error, 'Failed to remove profile picture');
    } finally {
      setRemovingPhoto(false);
    }
  };

  // Update Profile Information
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name cannot be empty');
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };
      await api.patch('/users/me', payload);
      auth.updateCurrentUser(payload);
      setUser((prev) => (prev ? { ...prev, ...payload } : null));
      toast.success('Profile information saved!');
    } catch (error: unknown) {
      showErrorToast(error, 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      showErrorToast(error, 'Failed to change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Update Notification Preferences
  const handleToggleNotification = async (key: keyof typeof notificationPrefs) => {
    const nextVal = !notificationPrefs[key];
    const prevVal = notificationPrefs[key];
    setNotificationPrefs((prev) => ({ ...prev, [key]: nextVal }));

    try {
      // Send ONLY the specific updated field to backend
      await api.patch('/users/me/notification-preferences', { [key]: nextVal });
      toast.success('Preference updated');
    } catch (error: unknown) {
      setNotificationPrefs((prev) => ({ ...prev, [key]: prevVal }));
      showErrorToast(error, 'Failed to update preference');
    }
  };

  // Deactivate / Delete Account
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete('/users/me');
      toast.success('Account deactivated');
      await auth.logout();
      router.push('/');
    } catch (error: unknown) {
      showErrorToast(error, 'Failed to deactivate account');
    } finally {
      setDeletingAccount(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500" />
          <p className="text-xs text-gray-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  const sections = getSections();
  const currentAvatarUrl = photoPreview || user?.profilePicture;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              Deactivate Account?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to deactivate your account? Your profile and active sessions will be disabled. You can reactivate by contacting support.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deletingAccount}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-sm shadow-red-600/30"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  'Yes, Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings & Preferences</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your account credentials, display picture, and platform configuration
              </p>
            </div>
            {user?.role && (
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user.role} Account
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              {/* Mini User Summary Card */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-orange-50/50 to-amber-50/50">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden ring-2 ring-orange-200 shrink-0">
                  {currentAvatarUrl ? (
                    <Image
                      src={currentAvatarUrl}
                      alt="Avatar"
                      width={40}
                      height={40}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-orange-600">
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="p-2 space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span>{section.label}</span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition ${
                          isActive ? 'text-white' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  );
                })}

                <div className="my-2 border-t border-gray-100" />

                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* ========================================================= */}
            {/* 1. PROFILE & AVATAR SECTION */}
            {/* ========================================================= */}
            {activeSection === 'profile' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-6">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your display picture, personal details, and delivery contact
                  </p>
                </div>

                <div className="p-6 pt-0 space-y-8">
                  {/* Interactive Display Picture (DP) Card */}
                  <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Display Picture (Avatar)</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                      {/* Avatar preview with drag/drop and camera trigger */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative w-24 h-24 rounded-full overflow-hidden shrink-0 cursor-pointer group shadow-sm transition ring-4 ${
                          isDragOver
                            ? 'ring-orange-500 scale-105'
                            : 'ring-white hover:ring-orange-200'
                        }`}
                        title="Click or drag image to change"
                      >
                        {currentAvatarUrl ? (
                          <Image
                            src={currentAvatarUrl}
                            alt="Profile"
                            width={96}
                            height={96}
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                            <span className="text-3xl font-bold text-orange-600">
                              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}

                        {/* Hover Camera Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-[2px]">
                          <Camera className="w-6 h-6 mb-0.5" />
                          <span className="text-[10px] font-semibold">Change</span>
                        </div>

                        {/* Uploading Spinner Overlay */}
                        {(uploadingPhoto || removingPhoto) && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-400 mb-1" />
                            <span className="text-[10px] font-medium">
                              {uploadingPhoto ? 'Uploading' : 'Removing'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Controls and hints */}
                      <div className="flex-1 space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleProfileUpload}
                          disabled={uploadingPhoto || removingPhoto}
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhoto || removingPhoto}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition shadow-sm shadow-orange-500/20 disabled:opacity-50"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {uploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                          </button>

                          {user?.profilePicture && (
                            <button
                              type="button"
                              onClick={handleRemoveProfilePicture}
                              disabled={uploadingPhoto || removingPhoto}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50 transition disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {removingPhoto ? 'Removing...' : 'Remove Photo'}
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                          Supported formats: <span className="font-medium text-gray-700">JPEG, PNG, WebP</span>. Max size <span className="font-medium text-gray-700">2MB</span>. Photos sync instantly to your navigation bar, orders, and public profile.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information Form */}
                  <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. John Doe"
                          required
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                        />
                      </div>

                      {/* Email (Read Only) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Email Address
                          </label>
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                          />
                          <Lock className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-3.5" />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 01712345678"
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Used by delivery riders to coordinate arrival.</p>
                      </div>

                      {/* Default Delivery Address */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Primary Delivery Address
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. House 12, Road 4, Dhanmondi, Dhaka"
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Default address preselected at checkout.</p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        {isProfileDirty && (
                          <span className="text-xs text-amber-600 font-medium">
                            • You have unsaved profile changes
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={savingProfile || !isProfileDirty}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition shadow-sm shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. SAVED ADDRESSES SECTION (NON-ADMIN) */}
            {/* ========================================================= */}
            {activeSection === 'addresses' && user?.role !== 'admin' && (
              <AddressesSection />
            )}

            {/* ========================================================= */}
            {/* 3. PAYMENT METHODS SECTION (NON-ADMIN) */}
            {/* ========================================================= */}
            {activeSection === 'payment' && user?.role !== 'admin' && (
              <PaymentMethodsSection />
            )}

            {/* ========================================================= */}
            {/* 4. FAVORITES SECTION (NON-ADMIN) */}
            {/* ========================================================= */}
            {activeSection === 'favorites' && user?.role !== 'admin' && (
              <FavoritesSection />
            )}

            {/* ========================================================= */}
            {/* 5. NOTIFICATIONS SECTION */}
            {/* ========================================================= */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                {/* In-App Alerts Channel */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-orange-500" />
                        In-App & Real-Time Alerts
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Notifications delivered directly within your QuickBite browser session
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Live Order Status Updates</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Instant alerts when restaurants accept, prepare, or mark orders ready
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.inAppOrderStatus}
                        onChange={() => handleToggleNotification('inAppOrderStatus')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Rider & Delivery Tracking</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Live alerts when your delivery agent picks up food and approaches your location
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.inAppDeliveryUpdate}
                        onChange={() => handleToggleNotification('inAppDeliveryUpdate')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Review & Rating Reminders</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Reminders to rate your meal and driver after successful delivery
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.inAppReview}
                        onChange={() => handleToggleNotification('inAppReview')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Promotional Deals & Discounts</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Flash sale banners, promo codes, and free delivery vouchers
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.inAppPromotional}
                        onChange={() => handleToggleNotification('inAppPromotional')}
                      />
                    </div>
                  </div>
                </div>

                {/* Email Notifications Channel */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-orange-500" />
                      Email Notifications
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Transactional emails and receipts sent to {user?.email}
                    </p>
                  </div>

                  <div className="divide-y divide-gray-100">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Order Receipts & Status</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Itemized receipts and status change confirmation emails
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.emailOrderStatus}
                        onChange={() => handleToggleNotification('emailOrderStatus')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Delivery Confirmation Emails</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Proof-of-delivery receipts when an order is completed
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.emailDeliveryUpdate}
                        onChange={() => handleToggleNotification('emailDeliveryUpdate')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Promotions & Weekly Newsletters</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Weekend discounts, new restaurant announcements, and coupons
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.emailPromotional}
                        onChange={() => handleToggleNotification('emailPromotional')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Review Invitations</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Email invitations to share your experience with food items
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.emailReview}
                        onChange={() => handleToggleNotification('emailReview')}
                      />
                    </div>
                  </div>
                </div>

                {/* Push Notifications Channel */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-orange-500" />
                      Browser Push Notifications
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      System push notifications when QuickBite is in the background
                    </p>
                  </div>

                  <div className="divide-y divide-gray-100">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Order Updates Push</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Timely alerts when order progress changes
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.pushOrderStatus}
                        onChange={() => handleToggleNotification('pushOrderStatus')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Driver Proximity Push</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pushes when the delivery driver is less than 5 minutes away
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.pushDeliveryUpdate}
                        onChange={() => handleToggleNotification('pushDeliveryUpdate')}
                      />
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Special Offers Push</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          High-value coupons and limited-time discounts
                        </p>
                      </div>
                      <ToggleButton
                        value={notificationPrefs.pushPromotional}
                        onChange={() => handleToggleNotification('pushPromotional')}
                      />
                    </div>
                  </div>
                </div>

                {/* Partner Alerts (Owner or Agent) */}
                {(user?.role === 'owner' || user?.role === 'agent') && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Store className="w-5 h-5 text-orange-500" />
                        Partner & Business Alerts
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Operational alerts for restaurant orders and delivery payouts
                      </p>
                    </div>

                    <div className="divide-y divide-gray-100">
                      <div className="p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">New Incoming Orders (Email & Push)</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            High-priority alert when a customer places an order
                          </p>
                        </div>
                        <ToggleButton
                          value={notificationPrefs.emailNewOrder}
                          onChange={() => {
                            handleToggleNotification('emailNewOrder');
                            handleToggleNotification('pushNewOrder');
                          }}
                        />
                      </div>

                      <div className="p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Earnings & Payout Reports</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Weekly breakdown of revenues, delivery fees, and platform settlements
                          </p>
                        </div>
                        <ToggleButton
                          value={notificationPrefs.emailEarnings}
                          onChange={() => handleToggleNotification('emailEarnings')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 6. SECURITY & PASSWORD SECTION */}
            {/* ========================================================= */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                {/* Change Password Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Password & Authentication</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Keep your credentials secure with a strong unique password
                    </p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="p-6 space-y-4 max-w-xl">
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new strong password"
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password Strength Meter */}
                      {newPassword && (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Strength:</span>
                            <span className="font-semibold text-gray-800">{passwordStrength.label}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${passwordStrength.color}`}
                              style={{
                                width: `${(passwordStrength.score / 3) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={updatingPassword || !newPassword || newPassword !== confirmPassword}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition shadow-sm shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {updatingPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating Password...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Two-Factor Authentication Status Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Two-Factor Authentication (2FA)</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Add an extra layer of protection using authenticator apps like Google Authenticator or Authy
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                    Protected
                  </span>
                </div>

                {/* Danger Zone: Account Deactivation */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                  <div className="p-6 border-b border-red-50 bg-red-50/30">
                    <h3 className="text-sm font-bold text-red-900">Danger Zone</h3>
                    <p className="text-xs text-red-700 mt-0.5">
                      Irreversible actions regarding your account data and access
                    </p>
                  </div>
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Deactivate Account</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Temporarily suspend your account and revoke all logged-in devices
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition"
                    >
                      Deactivate Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 7. APPEARANCE & REGIONAL SETTINGS */}
            {/* ========================================================= */}
            {activeSection === 'appearance' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-6">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Appearance & Regional Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Customize themes, display currency, and localization preferences
                  </p>
                </div>

                <div className="p-6 pt-0 space-y-6">
                  {/* Theme Mode */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setAppearance({ ...appearance, theme: 'light' })}
                        className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border transition ${
                          appearance.theme === 'light'
                            ? 'border-orange-500 bg-orange-50 text-orange-600 font-semibold ring-1 ring-orange-500'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Sun className="w-4 h-4" />
                        <span className="text-xs">Light Mode</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAppearance({ ...appearance, theme: 'dark' })}
                        className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border transition ${
                          appearance.theme === 'dark'
                            ? 'border-orange-500 bg-orange-50 text-orange-600 font-semibold ring-1 ring-orange-500'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Moon className="w-4 h-4" />
                        <span className="text-xs">Dark Mode</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAppearance({ ...appearance, theme: 'system' })}
                        className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border transition ${
                          appearance.theme === 'system'
                            ? 'border-orange-500 bg-orange-50 text-orange-600 font-semibold ring-1 ring-orange-500'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        <span className="text-xs">System</span>
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Language
                    </label>
                    <select
                      value={appearance.language}
                      onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white"
                    >
                      <option value="en">English (US)</option>
                      <option value="bn">বাংলা (Bengali)</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Currency
                    </label>
                    <select
                      value={appearance.currency}
                      onChange={(e) => setAppearance({ ...appearance, currency: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white"
                    >
                      <option value="BDT">Bangladeshi Taka (৳ BDT)</option>
                      <option value="USD">US Dollar ($ USD)</option>
                    </select>
                  </div>

                  {/* Sound Effects */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                      Order Sounds
                    </label>
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                      <div className="flex items-center gap-2.5">
                        {sound.soundsEnabled ? (
                          <Volume2 className="w-4 h-4 text-orange-600" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs font-medium text-gray-700">
                          {sound.soundsEnabled ? 'Chime on new notifications' : 'Muted'}
                        </span>
                      </div>
                      <ToggleButton
                        value={sound.soundsEnabled}
                        onChange={() => setSound({ ...sound, soundsEnabled: !sound.soundsEnabled })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 8. SUPPORT & HELP SECTION */}
            {/* ========================================================= */}
            {activeSection === 'support' && <SupportSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS
// =========================================================================

function ToggleButton({
  value,
  onChange,
}: {
  value: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
        value ? 'bg-orange-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function AddressesSection() {
  const { addresses, selectedAddress, setSelectedAddress, removeAddress } =
    useAddressStore();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your delivery locations</p>
        </div>
        <button
          onClick={() => {
            window.dispatchEvent(new Event('open-location-modal'));
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition shadow-sm shadow-orange-500/20"
        >
          + Add New Address
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {addresses.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No saved addresses yet</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div key={address.id} className="p-5 hover:bg-gray-50/50 transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <p className="font-semibold text-gray-800 text-sm">
                      {address.area || address.name || address.street}
                    </p>
                    {selectedAddress?.id === address.id && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{address.street}</p>
                  <p className="text-xs text-gray-400">{address.city}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAddress(address)}
                    className="px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition"
                  >
                    Set Default
                  </button>
                  <button
                    onClick={() => removeAddress(address.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PaymentMethodsSection() {
  const [paymentMethods] = useState([
    {
      id: 1,
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiry: '12/28',
      isDefault: true,
    },
    {
      id: 2,
      type: 'bkash',
      last4: '5678',
      brand: 'bKash Wallet',
      expiry: 'Linked',
      isDefault: false,
    },
  ]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
          <p className="text-sm text-gray-500 mt-1">Manage linked cards and mobile wallets</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {paymentMethods.map((method) => (
          <div key={method.id} className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {method.brand} •••• {method.last4}
                </p>
                <p className="text-xs text-gray-400">Expires {method.expiry}</p>
              </div>
            </div>
            <div>
              {method.isDefault ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                  Default
                </span>
              ) : (
                <span className="text-xs text-gray-400">Active</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FavoritesSection() {
  const { items } = useFavoritesStore();

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Favorite Restaurants</h2>
          <p className="text-sm text-gray-500 mt-1">Your bookmarked eateries</p>
        </div>
        <div className="p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No favorite restaurants added yet</p>
          <Link
            href="/"
            className="mt-3 text-orange-500 hover:underline text-xs font-semibold inline-block"
          >
            Explore Restaurants →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Favorite Restaurants</h2>
        <p className="text-sm text-gray-500 mt-1">Your bookmarked eateries ({items.length})</p>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((restaurant) => (
          <div key={restaurant.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                🍽️
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{restaurant.name}</p>
                <p className="text-xs text-gray-500">
                  {restaurant.cuisineType || 'Restaurant'} • ⭐ {restaurant.rating || 'New'}
                </p>
              </div>
            </div>
            <Link
              href={`/restaurants/${restaurant.id}`}
              className="px-3.5 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
            >
              View Menu
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupportSection() {
  const supportOptions = [
    {
      icon: HelpCircle,
      label: 'Help Center',
      description: 'Frequently asked questions and user guides',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: MessageSquare,
      label: 'Live Chat Support',
      description: 'Instant answers from customer service',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Mail,
      label: 'Email Inquiries',
      description: 'hello@quickbite.com',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: Phone,
      label: 'Hotline Helpline',
      description: '+880 1700 000000',
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Support & Help Desk</h2>
        <p className="text-sm text-gray-500 mt-1">Get immediate assistance with orders or your account</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportOptions.map((option) => (
          <div
            key={option.label}
            className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-sm hover:border-gray-200 transition"
          >
            <div className={`w-11 h-11 rounded-xl ${option.color} flex items-center justify-center shrink-0`}>
              <option.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-800 text-sm">{option.label}</p>
              <p className="text-xs text-gray-500 truncate">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}