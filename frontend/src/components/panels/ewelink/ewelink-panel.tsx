
import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Switch, CircularProgress } from '@mui/material';
import { apiClient } from '@/lib/api-client';

interface Device {
    id: string;
    name: string;
    integrationName?: string; // API might return integrationName
    model: string;
    manufacturer: string;
    areaId: string;
    state?: string; // Optional if we fetch state separately or if included
}

export const EwelinkPanel = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const data = await apiClient.get<Device[]>('/devices');
                // Filter for eWeLink
                const filtered = data.filter(d =>
                    d.manufacturer === 'eWeLink' ||
                    d.integrationName?.toLowerCase() === 'ewelink'
                );
                setDevices(filtered);
            } catch (err) {
                console.error("Failed to fetch devices", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">eWeLink Smart Home</Typography>
                <Button variant="contained" href="/settings">Manage Integration</Button>
            </Box>

            {loading ? <CircularProgress /> : devices.length === 0 ? (
                <Card>
                    <CardContent>
                        <Typography>No eWeLink devices found. Ensure the integration is configured in Settings.</Typography>
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={2}>
                    {devices.map(device => (
                        <Grid item xs={12} sm={6} md={4} key={device.id}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6">{device.name}</Typography>
                                    <Typography color="textSecondary">{device.model}</Typography>
                                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography>Status: {device.state || 'Unknown'}</Typography>
                                        {/* Switch logic placeholder */}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};
