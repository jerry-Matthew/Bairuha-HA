"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Box, CircularProgress, Alert } from "@mui/material";

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export function MapComponent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null); // Use any for now or imported type

  // Effect 1: Fetch location data
  useEffect(() => {
    console.log('MapComponent: Fetching location...');

    fetch('/api/location')
      .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(deviceLocation => {
        console.log('Location received:', deviceLocation);
        setLocation(deviceLocation);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error:", err);
        setError(`Failed to load map: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // Effect 2: Initialize map once data is loaded and ref is ready
  useEffect(() => {
    if (loading || !location || !mapRef.current || mapInstanceRef.current) return;

    console.log('MapComponent: Initializing map...');

    // Initialize map centered on device location
    const map = L.map(mapRef.current).setView(
      [location.latitude, location.longitude],
      13
    );

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create custom icon for Raspberry Pi
    const raspberryPiIcon = L.divIcon({
      className: "custom-raspberry-pi-marker",
      html: `
        <div style="
          background-color: #c51a4a;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    // Add marker for Raspberry Pi
    const marker = L.marker(
      [location.latitude, location.longitude],
      { icon: raspberryPiIcon }
    ).addTo(map);

    // Create popup content
    const popupContent = `
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
          ${location.name}
        </h3>
        <p style="margin: 4px 0; font-size: 14px; color: #666;">
          <strong>Location:</strong> ${location.address || 'Unknown'}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #999;">
          ${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #999;">
          Last updated: ${new Date(location.lastUpdated).toLocaleString()}
        </p>
      </div>
    `;

    marker.bindPopup(popupContent).openPopup();

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, location]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = {
          ...location,
          latitude,
          longitude,
          address: "Current Device Location (Browser GPS)",
          method: 'gps'
        };
        setLocation(newLocation);
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        let errorMessage = "Unable to retrieve your location.";

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "❌ Location permission denied. Please click the lock/info icon in your address bar to allow location access.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "❌ Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage = "❌ Request to get location timed out.";
            break;
        }

        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: 2,
          overflow: 'hidden'
        }}
      >
        <button
          onClick={handleLocateMe}
          style={{
            border: 'none',
            background: 'white',
            padding: '10px 15px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
          Locate Me
        </button>
      </Box>
    </Box>
  );
}
