'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Search, ChevronRight, Loader2 } from 'lucide-react';
import { useAddressStore } from '@/app/stores/addressStore';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Import leaflet icons setup
import '@/app/lib/leaflet-icons';

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

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
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

  useEffect(() => {
    if (!isOpen) {
      setStep('search');
      setSearchTerm('');
      setSearchResults([]);
      setSelectedAddress('');
    }
  }, [isOpen]);

  const handleSearchLocation = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
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
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        setSelectedAddress(data.display_name || 'Current Location');
        setStep('map');
        setIsDetecting(false);
      },
      (error) => {
        toast.error('Unable to get location');
        setIsDetecting(false);
      }
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

  const handleSelectPopularLocation = (location: typeof popularLocations[0]) => {
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
      fullAddress: selectedAddress, // Store complete address from map
    };
    
    addAddress(address);
    setStoreAddress(address);
    toast.success('Location set successfully');
    onClose();
  };

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {step === 'search' ? 'Your delivery address' : 'Select on map'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[80vh] overflow-y-auto">
          {step === 'search' ? (
            <div className="p-4">
              {/* Subtitle */}
              <p className="text-sm text-gray-500 mb-4">Add address for search accuracy</p>

              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Enter delivery address"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                  className="w-full pl-10 pr-16 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleSearchLocation}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500 text-sm font-medium"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
                </button>
              </div>

              {/* Current Location Button */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={isDetecting}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-orange-500 transition mb-6"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800">Use current location</p>
                  <p className="text-xs text-gray-400">Detect your current location</p>
                </div>
                {isDetecting && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
              </button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-6 border rounded-xl overflow-hidden">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition text-left border-b last:border-b-0"
                    >
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{result.display_name.split(',')[0]}</p>
                        <p className="text-xs text-gray-400">{result.display_name.split(',').slice(1, 4).join(',')}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* Popular Locations */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Popular locations</h3>
                <div className="flex flex-wrap gap-2">
                  {popularLocations.map((location) => (
                    <button
                      key={location.name}
                      onClick={() => handleSelectPopularLocation(location)}
                      className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition"
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Map Container */}
              <div className="h-80 rounded-xl overflow-hidden mb-4">
                <MapContainer
                  center={[selectedLat, selectedLng]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  <Marker
                    position={[selectedLat, selectedLng]}
                    draggable={true}
                    eventHandlers={{
                      dragend: async (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        setSelectedLat(position.lat);
                        setSelectedLng(position.lng);
                        
                        const response = await fetch(
                          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
                        );
                        const data = await response.json();
                        setSelectedAddress(data.display_name || 'Selected location');
                      },
                    }}
                  >
                    <Popup>Drag to adjust location</Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Selected Address */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Selected address</p>
                <p className="text-sm text-gray-800 line-clamp-2">{selectedAddress || 'Drag marker to select location'}</p>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmLocation}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
              >
                Confirm Location
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}