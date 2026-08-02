// components/LocationModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Search,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAddressStore } from '@/stores/addressStore';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import '@/lib/leaflet-icons';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false },
);

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const popularLocations = [
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, area: 'Gulshan' },
  { name: 'Chittagong', lat: 22.3569, lng: 91.7832, area: 'GEC' },
  { name: 'Sylhet', lat: 24.8949, lng: 91.8687, area: 'Zindabazar' },
  { name: 'Rajshahi', lat: 24.3745, lng: 88.6042, area: 'Shaheb Bazar' },
  { name: 'Khulna', lat: 22.8456, lng: 89.5403, area: 'Sonadanga' },
];

export default function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const [step, setStep] = useState<'search' | 'map'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedLat, setSelectedLat] = useState(23.8103);
  const [selectedLng, setSelectedLng] = useState(90.4125);
  const [selectedAddress, setSelectedAddress] = useState('');

  const { addAddress, setSelectedAddress: setStoreAddress } = useAddressStore();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setStep('search');
      setSearchTerm('');
      setSearchResults([]);
      setSelectedAddress('');
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSearchLocation = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchTerm,
        )}&limit=5&addressdetails=1`,
      );
      const data = await response.json();
      setSearchResults(data);
    } catch {
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setIsDetecting(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = await response.json();
          setSelectedAddress(data.display_name || 'Current Location');
        } catch {
          setSelectedAddress('Current Location');
        }
        setStep('map');
        setIsDetecting(false);
      },
      () => {
        toast.error('Unable to get location');
        setIsDetecting(false);
      },
    );
  };

  const handleSelectSearchResult = (result: any) => {
    setSelectedLat(parseFloat(result.lat));
    setSelectedLng(parseFloat(result.lon));
    setSelectedAddress(result.display_name);
    setStep('map');
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleSelectPopularLocation = (location: (typeof popularLocations)[0]) => {
    setSelectedLat(location.lat);
    setSelectedLng(location.lng);
    setSelectedAddress(`${location.area}, ${location.name}`);
    setStep('map');
  };

  const handleConfirmLocation = () => {
    if (!selectedAddress) {
      toast.error('Please select a location');
      return;
    }

    const address = {
      id: Date.now().toString(),
      name: selectedAddress.split(',')[0] || 'Selected Location',
      street: selectedAddress.split(',')[0]?.trim() || '',
      city: selectedAddress.split(',').slice(-2, -1)[0]?.trim() || 'Dhaka',
      area: selectedAddress.split(',')[0]?.trim() || '',
      landmark: '',
      lat: selectedLat,
      lng: selectedLng,
      fullAddress: selectedAddress,
    };

    addAddress(address);
    setStoreAddress(address);
    toast.success('Location set successfully');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-110 bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {step === 'search' ? 'Delivery address' : 'Confirm on map'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'search' ? (
            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-500">
                Add an address for better restaurant suggestions
              </p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search area, street, landmark..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                  className="w-full pl-10 pr-16 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                />
                <button
                  onClick={handleSearchLocation}
                  disabled={isSearching}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-orange-600 hover:text-orange-700 px-2 py-1"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </button>
              </div>

              {/* Current location */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={isDetecting}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition">
                  <Navigation className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-800">
                    Use current location
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detect automatically
                  </p>
                </div>
                {isDetecting && (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                )}
              </button>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full flex items-start gap-3 p-3.5 hover:bg-slate-50 transition text-left"
                    >
                      <MapPin className="w-4.5 h-4.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {result.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {result.display_name
                            .split(',')
                            .slice(1, 4)
                            .join(',')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              )}

              {/* Popular */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Popular cities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularLocations.map((location) => (
                    <button
                      key={location.name}
                      onClick={() => handleSelectPopularLocation(location)}
                      className="px-4 py-2 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-sm font-medium text-slate-700 transition"
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Map */}
              <div className="h-72 rounded-2xl overflow-hidden border border-slate-200">
                <MapContainer
                  center={[selectedLat, selectedLng]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  <Marker
                    position={[selectedLat, selectedLng]}
                    draggable
                    eventHandlers={{
                      dragend: async (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        setSelectedLat(position.lat);
                        setSelectedLng(position.lng);
                        try {
                          const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`,
                          );
                          const data = await response.json();
                          setSelectedAddress(
                            data.display_name || 'Selected location',
                          );
                        } catch {
                          setSelectedAddress('Selected location');
                        }
                      },
                    }}
                  >
                    <Popup>Drag to adjust</Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Selected address card */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Selected address
                </p>
                <p className="text-sm text-slate-800 leading-snug line-clamp-2">
                  {selectedAddress || 'Drag the marker to choose a location'}
                </p>
              </div>

              {/* Confirm */}
              <button
                onClick={handleConfirmLocation}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition"
              >
                Confirm location
              </button>

              <button
                onClick={() => setStep('search')}
                className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
              >
                ← Back to search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}