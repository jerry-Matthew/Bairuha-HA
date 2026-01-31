"use client";

import { useEffect, useState, useRef } from 'react';
import { Box, Paper, TextField, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { PanelHeader } from '@/components/ui/panel-header';
import { getSetting, saveSetting, type DeviceInfo } from '@/lib/api/settings';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LeafletMap({ lat, lng, onLocationSelect }: { lat: number, lng: number, onLocationSelect: (lat: number, lng: number) => void }) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        // Force cleanup of residual Leaflet instance on the element
        const container = mapContainerRef.current as any;
        if (container._leaflet_id) {
            container._leaflet_id = null;
        }

        const map = L.map(mapContainerRef.current).setView([lat, lng], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        // Handle marker drag
        marker.on('dragend', function (event) {
            const m = event.target;
            const position = m.getLatLng();
            onLocationSelect(position.lat, position.lng);
        });

        // Handle map click
        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync props to map
    useEffect(() => {
        if (!mapInstanceRef.current || !markerRef.current) return;

        // Only update if significantly moved to prevent jitter loop with drag
        const currentCenter = mapInstanceRef.current.getCenter();
        const dist = Math.sqrt(Math.pow(currentCenter.lat - lat, 2) + Math.pow(currentCenter.lng - lng, 2));

        if (dist > 0.0001) {
            mapInstanceRef.current.setView([lat, lng], 13);
        }
        markerRef.current.setLatLng([lat, lng]);
    }, [lat, lng]);

    return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
}

export function GeneralSettings() {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getSetting<DeviceInfo>('device_info');
            if (data) {
                setDeviceInfo(data);
            } else {
                // Fallback to fetch current location API if DB is empty
                const res = await fetch('/api/location');
                const loc = await res.json();
                setDeviceInfo({
                    name: loc.name,
                    address: loc.address || '',
                    latitude: loc.latitude,
                    longitude: loc.longitude
                });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            await saveSetting('device_info', {
                ...deviceInfo,
                lastUpdated: new Date().toISOString()
            });

            setSuccess('Settings saved successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setDeviceInfo(prev => ({
                    ...prev,
                    latitude,
                    longitude,
                    address: 'Current Browser Location'
                }));
            },
            (err) => {
                setError("Unable to retrieve location: " + err.message);
            }
        );
    };

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <PanelHeader
                title="General Settings"
                description="Configure your Home Assistant instance"
            />

            <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Device Location
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    Set the physical location of your home. This is used for weather integration, presence detection, and map display.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Box sx={{ display: 'grid', gap: 3, my: 3 }}>
                    <TextField
                        label="Instance Name"
                        value={deviceInfo.name}
                        onChange={(e) => setDeviceInfo({ ...deviceInfo, name: e.target.value })}
                        fullWidth
                    />

                    <TextField
                        label="Address (Optional)"
                        value={deviceInfo.address}
                        onChange={(e) => setDeviceInfo({ ...deviceInfo, address: e.target.value })}
                        fullWidth
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Latitude"
                            type="number"
                            value={deviceInfo.latitude}
                            onChange={(e) => setDeviceInfo({ ...deviceInfo, latitude: parseFloat(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="Longitude"
                            type="number"
                            value={deviceInfo.longitude}
                            onChange={(e) => setDeviceInfo({ ...deviceInfo, longitude: parseFloat(e.target.value) })}
                            fullWidth
                        />
                    </Box>
                </Box>

                <Box sx={{ height: 400, width: '100%', mb: 3, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                    {typeof window !== 'undefined' && !error && (
                        <LeafletMap
                            lat={deviceInfo.latitude || 0}
                            lng={deviceInfo.longitude || 0}
                            onLocationSelect={(lat, lng) => setDeviceInfo(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button variant="outlined" onClick={handleLocateMe}>
                        Detect Location
                    </Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
