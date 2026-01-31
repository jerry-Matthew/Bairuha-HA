"use client";

import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Alert,
    Box,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { HacsExtension } from "../server/hacs.types";

interface InstallationInstructionsDialogProps {
    open: boolean;
    onClose: () => void;
    extension: HacsExtension;
}

export function InstallationInstructionsDialog({
    open,
    onClose,
    extension,
}: InstallationInstructionsDialogProps) {

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6">Install {extension.name}</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Alert severity="success" sx={{ mb: 3 }}>
                    Good news! This integration can be installed automatically.
                </Alert>

                <Typography variant="body1" paragraph>
                    You do not need to perform manual steps. Simply use the <strong>Download</strong> button in the menu (three dots) or the details pane to install this integration directly.
                </Typography>

                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                    How to install:
                </Typography>

                <List>
                    <ListItem>
                        <ListItemIcon>
                            <Typography variant="h6" color="primary">1</Typography>
                        </ListItemIcon>
                        <ListItemText
                            primary="Click the 'Download' button"
                            secondary="It is located in the actions menu (three dots) or the details drawer."
                        />
                    </ListItem>

                    <ListItem>
                        <ListItemIcon>
                            <Typography variant="h6" color="primary">2</Typography>
                        </ListItemIcon>
                        <ListItemText primary="Wait for the download to complete" />
                    </ListItem>

                    <ListItem>
                        <ListItemIcon>
                            <Typography variant="h6" color="primary">3</Typography>
                        </ListItemIcon>
                        <ListItemText primary="Restart Home Assistant if prompted" />
                    </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Integration Details:
                    </Typography>
                    <Typography variant="body2">
                        <strong>Name:</strong> {extension.name}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Type:</strong> {extension.type}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Repository:</strong> {extension.githubRepo}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} variant="contained">Got it</Button>
            </DialogActions>
        </Dialog>
    );
}
