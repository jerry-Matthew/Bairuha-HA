"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    Typography,
    Switch,
    Box,
    CircularProgress,
    Alert,
    Snackbar,
} from "@mui/material";
import { useAppSelector } from "@/store/hooks";

// Render entity icon based on domain
const renderEntityIcon = (domain: string) => {
    const iconMap: Record<string, string> = {
        light: "💡",
        switch: "🔌",
        sensor: "📊",
        binary_sensor: "📡",
        climate: "🌡️",
        lock: "🔒",
        cover: "🚪",
        camera: "📷",
        media_player: "📺",
    };
    return iconMap[domain] || "⚙️";
};

/**
 * EntityCard Component
 * 
 * Re-selects entity from Redux on every render to ensure it always has the latest state.
 */
export default function EntityCard({ entityId, config }: { entityId: string, config?: any }) {
    // Re-select entity from Redux on every render
    const entity = useAppSelector((state) =>
        state.entities.entities.find((e) => e.entityId === entityId)
    );

    const [isControlling, setIsControlling] = useState(false);
    const [controlError, setControlError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [optimisticState, setOptimisticState] = useState<string | null>(null);

    if (!entity) {
        if (config?.showIfMissing) return <Card><CardContent>Entity not found: {entityId}</CardContent></Card>;
        return null;
    }

    const displayState = optimisticState || entity.state;
    const displayName = config?.name || entity.name || entity.entityId;

    const handleControl = async (newState: boolean) => {
        if (entity.state === "unavailable") {
            setSnackbarMessage("Cannot control unavailable entity");
            setSnackbarOpen(true);
            return;
        }

        setOptimisticState(newState ? "on" : "off");
        setIsControlling(true);
        setControlError(null);

        try {
            const command = newState ? "turn_on" : "turn_off";
            const response = await fetch("/api/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityId: entity.entityId, command, payload: {} }),
            });

            if (!response.ok) throw new Error(`Failed to ${command} entity`);

            const result = await response.json();
            setSnackbarMessage(result.success ? `Turned ${newState ? "on" : "off"}` : "Command sent");
            setSnackbarOpen(true);

            setTimeout(() => setOptimisticState(null), 2000);
        } catch (error) {
            setOptimisticState(null);
            setControlError(error instanceof Error ? error.message : "Failed to control");
            setSnackbarOpen(true);
        } finally {
            setIsControlling(false);
        }
    };

    return (
        <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="h5">{renderEntityIcon(entity.domain)}</Typography>
                        <Typography variant="h6" noWrap>{displayName}</Typography>
                    </Box>
                    {(entity.domain === "light" || entity.domain === "switch") && (
                        <Switch
                            checked={displayState === "on"}
                            onChange={(e) => handleControl(e.target.checked)}
                            disabled={isControlling || entity.state === "unavailable"}
                        />
                    )}
                </Box>
                <Typography variant="body2" color="text.secondary">State: <strong>{displayState}</strong></Typography>
                {controlError && <Alert severity="error" sx={{ mt: 1 }}>{controlError}</Alert>}
            </CardContent>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
            />
        </Card>
    );
}
