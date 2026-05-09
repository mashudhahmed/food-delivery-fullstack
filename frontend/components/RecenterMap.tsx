'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, map]);
  
  return null;
}