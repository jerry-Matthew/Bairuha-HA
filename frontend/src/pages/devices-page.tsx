
import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    CircularProgress,
    IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { PanelHeader } from '@/components/ui/panel-header';
import { apiClient } from '@/lib/api-client';
import AddDeviceEntry from '@/components/addDevice/AddDeviceEntry';

interface Device {
    id: string;
    name: string;
    integrationName: string;
    model: string;
    manufacturer: string;
    areaId: string;
    created_at: string;
}

export function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addDeviceOpen, setAddDeviceOpen] = useState(false);

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<Device[]>('/devices');
            setDevices(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch devices");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this device? This will also delete all its entities.")) return;
        try {
            await apiClient.delete(`/devices/${id}`);
            setDevices(prev => prev.filter(d => d.id !== id));
        } catch (err: any) {
            alert("Failed to delete device: " + err.message);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <PanelHeader
                    title="Devices"
                    description="Manage your smart devices"
                />
                <Button variant="contained" onClick={() => setAddDeviceOpen(true)}>
                    Add Device
                </Button>
            </Box>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Integration</TableCell>
                                <TableCell>Model</TableCell>
                                <TableCell>Area</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {devices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        No devices found. Click "Add Device" to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                devices.map((device) => (
                                    <TableRow key={device.id}>
                                        <TableCell>{device.name}</TableCell>
                                        <TableCell>{device.integrationName}</TableCell>
                                        <TableCell>{device.model || "-"}</TableCell>
                                        <TableCell>{device.areaId || "-"}</TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => handleDelete(device.id)} color="error" size="small">
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <AddDeviceEntry
                open={addDeviceOpen}
                onClose={() => {
                    setAddDeviceOpen(false);
                    fetchDevices(); // Refresh list on close
                }}
            />
        </Box>
    );
}
