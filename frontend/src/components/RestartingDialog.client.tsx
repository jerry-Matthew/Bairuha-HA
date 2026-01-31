"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    Typography,
    Box,
    CircularProgress,
    Button,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";

interface RestartingDialogProps {
    open: boolean;
    onClose: () => void;
    onRestartConfirmed: () => void;
}

export function RestartingDialog({ open, onClose, onRestartConfirmed }: RestartingDialogProps) {
    const [step, setStep] = useState<"confirm" | "restarting" | "success">("confirm");
    const [dots, setDots] = useState("");

    useEffect(() => {
        if (step === "restarting") {
            const interval = setInterval(() => {
                setDots((prev) => (prev.length < 3 ? prev + "." : ""));
            }, 500);
            return () => clearInterval(interval);
        }
    }, [step]);

    const handleRestart = async () => {
        setStep("restarting");
        onRestartConfirmed();

        // 1. Trigger restart
        try {
            await fetch("/api/restart", { method: "POST" });
        } catch (e) {
            // Ignore error as server might die immediately
        }

        // 2. Wait for server to die (simulated)
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 3. Poll for recovery
        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch("/api/hacs/installed-on-ha"); // Use a known endpoint
                if (res.ok) {
                    clearInterval(pollInterval);
                    setStep("success");
                }
            } catch (e) {
                // Still down
            }
        }, 2000);
    };

    const handleClose = () => {
        if (step === "success") {
            setStep("confirm"); // Reset for next time
            onClose();
            window.location.reload(); // Reload to ensure everything is fresh
        } else {
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={step === "restarting" ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogContent sx={{ textAlign: "center", py: 4 }}>
                {step === "confirm" && (
                    <Box>
                        <PowerSettingsNewIcon sx={{ fontSize: 60, color: "warning.main", mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Restart Server?
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            A restart is required to load the new integration. The server will briefly stop and restart.
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 3 }}>
                            <Button onClick={onClose} variant="outlined">
                                Cancel
                            </Button>
                            <Button onClick={handleRestart} variant="contained" color="warning">
                                Restart Now
                            </Button>
                        </Box>
                    </Box>
                )}

                {step === "restarting" && (
                    <Box>
                        <CircularProgress size={60} sx={{ mb: 3 }} />
                        <Typography variant="h6" gutterBottom>
                            Restarting Server{dots}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Please wait while the system reboots.
                            <br />
                            This usually takes 10-20 seconds.
                        </Typography>
                    </Box>
                )}

                {step === "success" && (
                    <Box>
                        <CheckCircleIcon sx={{ fontSize: 60, color: "success.main", mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Back Online!
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            The server has successfully restarted.
                        </Typography>
                        <Button onClick={handleClose} variant="contained" color="primary">
                            Reload Page
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
