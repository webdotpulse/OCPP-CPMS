"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet components to avoid SSR window issues
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

export default function MobileMap() {
  const [stations, setStations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [icon, setIcon] = useState<any>(null);
  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    setMounted(true);

    // Import L only on client
    import('leaflet').then((L) => {
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
      });
      setIcon(DefaultIcon);
    });

    const fetchStations = async () => {
      try {
        const response = await api.get('/stations');
        if (response.data) {
          setStations(response.data.filter((s: any) => typeof s.latitude === 'number' && typeof s.longitude === 'number'));
        }
      } catch (error) {
        logger.error('Failed to fetch stations for map', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStations();
  }, []);

  if (!mounted) return null;

  // Default center (e.g. Europe)
  const defaultCenter: [number, number] = [50.8503, 4.3517]; // Brussels

  // Calculate bounds if stations exist
  let mapCenter = defaultCenter;
  let mapZoom = 8;

  if (stations.length > 0) {
    const lats = stations.map(s => s.latitude);
    const lngs = stations.map(s => s.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    mapCenter = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

    if (stations.length === 1) {
       mapZoom = 13;
    }
  }

  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  return (
    <div className="flex flex-col h-full relative z-0">
      {isLoading || !icon ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{
              height: '100vh',
              width: '100%',
              zIndex: 0,
              filter: isDark ? 'invert(1) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none'
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stations.map((station) => (
              <Marker
                key={station.id}
                position={[station.latitude, station.longitude]}
                icon={icon}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold">{station.station_name}</h3>
                    <p className="text-muted-foreground mb-2">
                      {station.street_name}, {station.city}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
    </div>
  );
}
