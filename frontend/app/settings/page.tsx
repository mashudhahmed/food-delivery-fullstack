'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Shield,
  Users,
  MessageSquare,
  Gift,
  FileText,
  ChevronDown,
  Check,
  AlertCircle,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { useAddressStore } from '@/stores/addressStore';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  
  // Settings state
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotionalEmails: false,
    smsAlerts: true,
    appNotifications: true,
  });
  
  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    showProfile: true,
    twoFactorAuth: false,
  });
  
  const [appearance, setAppearance] = useState({
    theme: 'light', // light, dark, system
    language: 'en',
    currency: 'BDT',
  });
  
  const [sound, setSound] = useState({
    soundsEnabled: true,
    volume: 70,
  });

  useEffect(() => {
    const authenticated = auth.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (authenticated) {
      setUser(auth.getCurrentUser());
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    auth.logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const handleUpdateProfile = async () => {
    toast.success('Profile updated successfully');
  };

  const sections = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'appearance', label: 'Appearance & Language', icon: Globe },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-80 shrink-0">
            <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 transition ${
                    activeSection === section.id
                      ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
              
              <div className="border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                      {user?.fullName ? (
                        <span className="text-2xl font-bold text-orange-600">
                          {user.fullName.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <User className="w-10 h-10 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition">
                        Change Photo
                      </button>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG or GIF. Max 2MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.fullName || ''}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        defaultValue={user?.phone || ''}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateProfile}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Addresses Section */}
            {activeSection === 'addresses' && <AddressesSection />}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage how you receive updates</p>
                </div>
                
                <div className="divide-y divide-gray-100">
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">Order Updates</p>
                      <p className="text-sm text-gray-500">Get notified about order status changes</p>
                    </div>
                    <ToggleButton
                      value={notifications.orderUpdates}
                      onChange={() => setNotifications({ ...notifications, orderUpdates: !notifications.orderUpdates })}
                    />
                  </div>
                  
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">Promotional Emails</p>
                      <p className="text-sm text-gray-500">Receive offers and discounts via email</p>
                    </div>
                    <ToggleButton
                      value={notifications.promotionalEmails}
                      onChange={() => setNotifications({ ...notifications, promotionalEmails: !notifications.promotionalEmails })}
                    />
                  </div>
                  
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">SMS Alerts</p>
                      <p className="text-sm text-gray-500">Get delivery updates via SMS</p>
                    </div>
                    <ToggleButton
                      value={notifications.smsAlerts}
                      onChange={() => setNotifications({ ...notifications, smsAlerts: !notifications.smsAlerts })}
                    />
                  </div>
                  
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">App Notifications</p>
                      <p className="text-sm text-gray-500">Push notifications on your device</p>
                    </div>
                    <ToggleButton
                      value={notifications.appNotifications}
                      onChange={() => setNotifications({ ...notifications, appNotifications: !notifications.appNotifications })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Privacy & Security Section */}
            {activeSection === 'privacy' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800">Privacy & Security</h2>
                  <p className="text-sm text-gray-500 mt-1">Control your privacy settings</p>
                </div>
                
                <div className="divide-y divide-gray-100">
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">Share Location</p>
                      <p className="text-sm text-gray-500">Allow app to access your location</p>
                    </div>
                    <ToggleButton
                      value={privacy.shareLocation}
                      onChange={() => setPrivacy({ ...privacy, shareLocation: !privacy.shareLocation })}
                    />
                  </div>
                  
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">Show Profile</p>
                      <p className="text-sm text-gray-500">Make your profile visible to others</p>
                    </div>
                    <ToggleButton
                      value={privacy.showProfile}
                      onChange={() => setPrivacy({ ...privacy, showProfile: !privacy.showProfile })}
                    />
                  </div>
                  
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <button
                      onClick={() => setPrivacy({ ...privacy, twoFactorAuth: !privacy.twoFactorAuth })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        privacy.twoFactorAuth
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {privacy.twoFactorAuth ? 'Enabled' : 'Enable'}
                    </button>
                  </div>
                </div>

                {/* Change Password */}
                <div className="p-6 border-t border-gray-100">
                  <h3 className="font-medium text-gray-800 mb-3">Change Password</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current Password"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                    <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance & Language Section */}
            {activeSection === 'appearance' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800">Appearance & Language</h2>
                  <p className="text-sm text-gray-500 mt-1">Customize your app experience</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAppearance({ ...appearance, theme: 'light' })}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition ${
                          appearance.theme === 'light'
                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Sun className="w-5 h-5" />
                        <span className="text-sm font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setAppearance({ ...appearance, theme: 'dark' })}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition ${
                          appearance.theme === 'dark'
                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Moon className="w-5 h-5" />
                        <span className="text-sm font-medium">Dark</span>
                      </button>
                      <button
                        onClick={() => setAppearance({ ...appearance, theme: 'system' })}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition ${
                          appearance.theme === 'system'
                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Smartphone className="w-5 h-5" />
                        <span className="text-sm font-medium">System</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={appearance.language}
                      onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    >
                      <option value="en">English</option>
                      <option value="bn">বাংলা (Bengali)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={appearance.currency}
                      onChange={(e) => setAppearance({ ...appearance, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    >
                      <option value="BDT">Bangladeshi Taka (BDT)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="GBP">British Pound (GBP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sound Effects
                    </label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {sound.soundsEnabled ? (
                          <Volume2 className="w-5 h-5 text-gray-600" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-600">
                          {sound.soundsEnabled ? 'On' : 'Off'}
                        </span>
                      </div>
                      <ToggleButton
                        value={sound.soundsEnabled}
                        onChange={() => setSound({ ...sound, soundsEnabled: !sound.soundsEnabled })}
                      />
                    </div>
                    {sound.soundsEnabled && (
                      <div className="mt-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sound.volume}
                          onChange={(e) => setSound({ ...sound, volume: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-400 mt-1">Volume: {sound.volume}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods Section */}
            {activeSection === 'payment' && <PaymentMethodsSection />}

            {/* Favorites Section */}
            {activeSection === 'favorites' && <FavoritesSection />}

            {/* Support Section */}
            {activeSection === 'support' && <SupportSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== Helper Components ==========

function ToggleButton({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition ${
        value ? 'bg-orange-500' : 'bg-gray-300'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${
          value ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  );
}

// Addresses Section Component
function AddressesSection() {
  const { addresses, selectedAddress, setSelectedAddress, removeAddress } = useAddressStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', city: '', area: '' });

  const handleAddAddress = () => {
    if (!newAddress.street || !newAddress.city) return;
    
    const address = {
      id: Date.now().toString(),
      name: 'Custom Address',
      street: newAddress.street,
      city: newAddress.city,
      area: newAddress.area,
    };
    
    // Add to store (you'll need to implement this in your store)
    toast.success('Address added successfully');
    setIsAdding(false);
    setNewAddress({ street: '', city: '', area: '' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Saved Addresses</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your delivery addresses</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
        >
          Add New Address
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {addresses.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No saved addresses yet</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-3 text-orange-500 hover:underline text-sm"
            >
              Add your first address
            </button>
          </div>
        ) : (
          addresses.map((address) => (
            <div key={address.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <p className="font-medium text-gray-800">{address.area || address.street}</p>
                    {selectedAddress?.id === address.id && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{address.street}</p>
                  <p className="text-sm text-gray-500">{address.city}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAddress(address)}
                    className="px-3 py-1 text-sm text-orange-500 hover:bg-orange-50 rounded-lg transition"
                  >
                    Set as Default
                  </button>
                  <button
                    onClick={() => removeAddress(address.id)}
                    className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Address Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-semibold mb-4">Add New Address</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Street Address"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                value={newAddress.street}
                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
              />
              <input
                type="text"
                placeholder="Area"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                value={newAddress.area}
                onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
              />
              <input
                type="text"
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                value={newAddress.city}
                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsAdding(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAddress}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Methods Section
function PaymentMethodsSection() {
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, type: 'card', last4: '4242', brand: 'Visa', expiry: '12/25', isDefault: true },
    { id: 2, type: 'card', last4: '1234', brand: 'Mastercard', expiry: '08/26', isDefault: false },
  ]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Payment Methods</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your payment options</p>
        </div>
        <button className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition">
          Add Payment Method
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {paymentMethods.map((method) => (
          <div key={method.id} className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-medium text-gray-800">
                  {method.brand} •••• {method.last4}
                </p>
                <p className="text-sm text-gray-500">Expires {method.expiry}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {method.isDefault ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Default</span>
              ) : (
                <button className="text-sm text-orange-500 hover:underline">Set as Default</button>
              )}
              <button className="text-sm text-red-500 hover:underline">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Favorites Section
function FavoritesSection() {
  const favorites = [
    { id: 1, name: 'Pizza Paradise', cuisine: 'Italian', rating: 4.8, image: '/placeholder.jpg' },
    { id: 2, name: 'Burger House', cuisine: 'American', rating: 4.5, image: '/placeholder.jpg' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Favorite Restaurants</h2>
        <p className="text-sm text-gray-500 mt-1">Your saved restaurants</p>
      </div>

      {favorites.length === 0 ? (
        <div className="p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No favorite restaurants yet</p>
          <Link href="/" className="mt-3 text-orange-500 hover:underline text-sm inline-block">
            Browse restaurants
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {favorites.map((restaurant) => (
            <div key={restaurant.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🍕</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">{restaurant.name}</p>
                  <p className="text-sm text-gray-500">{restaurant.cuisine} • ⭐ {restaurant.rating}</p>
                </div>
              </div>
              <Link
                href={`/restaurants/${restaurant.id}`}
                className="px-3 py-1 text-sm text-orange-500 hover:bg-orange-50 rounded-lg transition"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Support Section
function SupportSection() {
  const supportOptions = [
    { icon: HelpCircle, label: 'Help Center', description: 'FAQs and guides', color: 'bg-blue-100 text-blue-600' },
    { icon: MessageSquare, label: 'Live Chat', description: 'Chat with support', color: 'bg-green-100 text-green-600' },
    { icon: Mail, label: 'Email Support', description: 'support@quickbite.com', color: 'bg-purple-100 text-purple-600' },
    { icon: Phone, label: 'Call Us', description: '+880 1234 567890', color: 'bg-orange-100 text-orange-600' },
    { icon: FileText, label: 'Report a Problem', description: 'Submit an issue', color: 'bg-red-100 text-red-600' },
    { icon: AlertCircle, label: 'Report Safety Issue', description: 'Emergency assistance', color: 'bg-yellow-100 text-yellow-600' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Support</h2>
        <p className="text-sm text-gray-500 mt-1">Get help with your account</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportOptions.map((option) => (
          <button
            key={option.label}
            className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition"
          >
            <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center`}>
              <option.icon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">{option.label}</p>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}