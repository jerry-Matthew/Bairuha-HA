const API_BASE = '/api/settings';

export interface DeviceInfo {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    lastUpdated?: string;
}

export async function getSetting<T>(key: string): Promise<T | null> {
    const res = await fetch(`${API_BASE}/${key}`);
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to fetch setting ${key}`);
    }
    return res.json();
}

export async function saveSetting(key: string, value: any): Promise<void> {
    const res = await fetch(`${API_BASE}/${key}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
    });

    if (!res.ok) {
        throw new Error(`Failed to save setting ${key}`);
    }
}
