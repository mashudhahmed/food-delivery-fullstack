'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import '@/lib/leaflet-icons';
import { Navigation, MapPin, Store, CheckCircle, Clock } from 'lucide-react';

// Dynamically import react-leaflet primitives to prevent SSR issues
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
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

interface DeliveryMapProps {
  status: string;
  restaurantName?: string;
  restaurantAddress?: string;
  deliveryAddress?: string;
}

// Known coordinates in Dhaka and major hubs
const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  gulshan: [23.7925, 90.4078],
  banani: [23.7937, 90.4066],
  dhanmondi: [23.7465, 90.376],
  uttara: [23.8759, 90.3795],
  mirpur: [23.8071, 90.3686],
  mohakhali: [23.7778, 90.4054],
  badda: [23.7806, 90.4267],
  motijheel: [23.733, 90.4172],
  bashundhara: [23.8191, 90.4326],
  mohammadpur: [23.7658, 90.3584],
  khilgaon: [23.7505, 90.4223],
  chittagong: [22.3569, 91.7832],
  sylhet: [24.8949, 91.8687],
  khulna: [22.8456, 89.5403],
  rajshahi: [24.3745, 88.6042],
};

function resolveCoordinate(address: string = '', seedOffset: number = 0): [number, number] {
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }

  // Deterministic fallback offset around Dhaka center (23.8103, 90.4125)
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) * 0.0004 + seedOffset * 0.015;
  const lngOffset = ((Math.abs(hash * 3) % 100) - 50) * 0.0004 + seedOffset * 0.015;

  return [23.8103 + latOffset, 90.4125 + lngOffset];
}

// Calculate approximate distance in km (Haversine formula)
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // km
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[0] * Math.PI) / 180) *
      Math.cos((coord2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function DeliveryMap({
  status,
  restaurantName = 'Restaurant',
  restaurantAddress = '',
  deliveryAddress = '',
}: DeliveryMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const restaurantCoords = useMemo(
    () => resolveCoordinate(restaurantAddress || restaurantName, -1),
    [restaurantAddress, restaurantName]
  );

  const deliveryCoords = useMemo(
    () => resolveCoordinate(deliveryAddress || 'Dhaka', 1),
    [deliveryAddress]
  );

  // Rider position based on order status
  const riderCoords = useMemo<[number, number]>(() => {
    const [rLat, rLng] = restaurantCoords;
    const [dLat, dLng] = deliveryCoords;

    switch (status) {
      case 'pending':
      case 'preparing':
      case 'ready':
        return [rLat, rLng];
      case 'picked_up':
        return [rLat + (dLat - rLat) * 0.3, rLng + (dLng - rLng) * 0.3];
      case 'on_the_way':
        return [rLat + (dLat - rLat) * 0.72, rLng + (dLng - rLng) * 0.72];
      case 'delivered':
        return [dLat, dLng];
      default:
        return [rLat, rLng];
    }
  }, [status, restaurantCoords, deliveryCoords]);

  const distanceKm = useMemo(
    () => calculateDistance(restaurantCoords, deliveryCoords),
    [restaurantCoords, deliveryCoords]
  );

  // Create Leaflet HTML divIcons only on client
  const icons = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const L = require('leaflet');

      const restaurantIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="background-color: #f97316; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2.5px solid white; font-size: 17px;">
            🍽️
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const customerIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="background-color: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2.5px solid white; font-size: 17px;">
            🏠
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const riderIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; background-color: #6366f1; border-radius: 50%; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; background-color: #4f46e5; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white; font-size: 18px;">
              🛵
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      return { restaurantIcon, customerIcon, riderIcon };
    } catch {
      return null;
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="h-72 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center animate-pulse">
        <p className="text-gray-400 text-sm">Loading map tracking...</p>
      </div>
    );
  }

  const mapBounds: [[number, number], [number, number]] = [
    [
      Math.min(restaurantCoords[0], deliveryCoords[0]) - 0.005,
      Math.min(restaurantCoords[1], deliveryCoords[1]) - 0.005,
    ],
    [
      Math.max(restaurantCoords[0], deliveryCoords[0]) + 0.005,
      Math.max(restaurantCoords[1], deliveryCoords[1]) + 0.005,
    ],
  ];

  const mapCenter: [number, number] = [
    (restaurantCoords[0] + deliveryCoords[0]) / 2,
    (restaurantCoords[1] + deliveryCoords[1]) / 2,
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
      {/* Top Map Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-orange-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-gray-800">Live Delivery Route</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1 font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
            📍 Est. {distanceKm} km
          </span>
          {status === 'on_the_way' && (
            <span className="flex items-center gap-1 text-orange-600 font-semibold bg-orange-50 px-2.5 py-0.5 rounded-full animate-pulse">
              <Clock className="w-3 h-3" />
              Rider En Route
            </span>
          )}
          {status === 'delivered' && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Delivered
            </span>
          )}
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative h-72 sm:h-80 w-full bg-slate-100">
        <MapContainer
          center={mapCenter}
          bounds={mapBounds}
          boundsOptions={{ padding: [50, 50] }}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* Route path */}
          <Polyline
            positions={[restaurantCoords, riderCoords, deliveryCoords]}
            pathOptions={{
              color: '#f97316',
              weight: 4,
              opacity: 0.85,
              dashArray: status === 'delivered' ? undefined : '8, 8',
            }}
          />

          {/* Restaurant Marker */}
          {icons?.restaurantIcon && (
            <Marker position={restaurantCoords} icon={icons.restaurantIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-gray-800 flex items-center gap-1">
                    🍽️ {restaurantName}
                  </p>
                  <p className="text-gray-500 mt-0.5">{restaurantAddress || 'Kitchen location'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Delivery Destination Marker */}
          {icons?.customerIcon && (
            <Marker position={deliveryCoords} icon={icons.customerIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-gray-800 flex items-center gap-1">
                    🏠 Delivery Location
                  </p>
                  <p className="text-gray-500 mt-0.5">{deliveryAddress || 'Your delivery destination'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Rider Marker (active during preparation, pickup, and en route) */}
          {icons?.riderIcon && status !== 'cancelled' && (
            <Marker position={riderCoords} icon={icons.riderIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-indigo-700 flex items-center gap-1">
                    🛵 Delivery Rider
                  </p>
                  <p className="text-gray-600 mt-0.5">
                    {status === 'on_the_way'
                      ? 'Rider is on the way to you!'
                      : status === 'picked_up'
                      ? 'Rider just picked up your order'
                      : status === 'delivered'
                      ? 'Order delivered successfully'
                      : 'Waiting at restaurant'}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Map Footer Route Details */}
      <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Store className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="font-medium text-gray-800 truncate max-w-[140px] sm:max-w-none">
            {restaurantName}
          </span>
          <span className="text-gray-300">→</span>
          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate max-w-[160px] sm:max-w-none">
            {deliveryAddress || 'Destination'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-gray-500">Live GPS tracking</span>
        </div>
      </div>
    </div>
  );
}
