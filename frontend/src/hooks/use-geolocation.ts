"use client";

import { useState, useEffect } from "react";

interface GeolocationState {
  lat: number | null;
  lon: number | null;
  error: string | null;
  loading: boolean;
}

/**
 * Hook to get user's geolocation
 * Requests permission and returns coordinates
 * Falls back gracefully if permission denied or unavailable
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lon: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        lat: null,
        lon: null,
        error: "Geolocation not supported",
        loading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        // Don't treat permission denied as an error - just use fallback
        setState({
          lat: null,
          lon: null,
          error: null,
          loading: false,
        });
      },
      {
        timeout: 5000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, []);

  return state;
}

