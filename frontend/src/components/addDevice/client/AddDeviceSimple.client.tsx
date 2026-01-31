
import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
} from "@mui/material";
import { apiClient } from "@/lib/api-client";

interface AddDeviceSimpleProps {
    open: boolean;
    onClose: () => void;
}

export function AddDeviceSimple({ open, onClose }: AddDeviceSimpleProps) {
    const [name, setName] = useState("");
    const [deviceType, setDeviceType] = useState("smart_light");
    const [area, setArea] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await apiClient.post("/devices/dev-register", {
                name,
                device_type: deviceType,
                area: area || undefined,
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setName("");
                setArea("");
                setSuccess(false);
                // Force refresh if needed, or use context
                window.location.reload();
            }, 1500);
        } catch (err: any) {
            console.error("Failed to add device:", err);
            setError(err.message || "Failed to add device");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Device (Dev)</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>Device added successfully!</Alert>}

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Device Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        sx={{ mb: 2 }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Device Type</InputLabel>
                        <Select
                            value={deviceType}
                            label="Device Type"
                            onChange={(e) => setDeviceType(e.target.value)}
                        >
                            <MenuItem value="smart_light">Smart Light</MenuItem>
                            <MenuItem value="smart_switch">Smart Switch</MenuItem>
                            <MenuItem value="temperature_sensor">Temperature Sensor</MenuItem>
                            <MenuItem value="motion_sensor">Motion Sensor</MenuItem>
                            <MenuItem value="thermostat">Thermostat</MenuItem>
                            <MenuItem value="door_lock">Door Lock</MenuItem>
                            <MenuItem value="garage_door">Garage Door</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        margin="dense"
                        label="Area (Optional)"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        helperText="e.g. Living Room"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : "Add Device"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
