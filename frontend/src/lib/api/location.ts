export interface DeviceLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
    country?: string;
    address?: string;
    type: 'raspberry_pi' | 'sensor' | 'camera';
    lastUpdated: Date;
}

/**
 * Fetch the Raspberry Pi's location (automatically detected via IP geolocation)
 */
export async function fetchDeviceLocation(): Promise<DeviceLocation> {
    const url = '/api/location';
    console.log('Fetching from:', url);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch device location: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Location data:', data);
    return data;
}

/**
 * Fetch all tracked devices
 */
export async function fetchAllDevices(): Promise<DeviceLocation[]> {
    const response = await fetch('/api/location/devices');

    if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.statusText}`);
    }

    return response.json();
}
