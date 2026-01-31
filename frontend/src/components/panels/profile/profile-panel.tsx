"use client";

import {
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import { PanelHeader } from "@/components/ui/panel-header";
import { formatDate, capitalizeName } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function ProfilePanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayUser = user || {
    id: "1",
    name: "User Name",
    email: "user@example.com",
    role: "admin" as const,
    memberSince: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString()
  };

  /**
   * Handle logout with industry-standard practices:
   * - Shows loading state
   * - Prevents multiple simultaneous calls
   * - Handles errors gracefully
   * - Redirects to login page (not home)
   */
  const handleLogout = async () => {
    // Prevent multiple simultaneous logout calls
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);

      // Call logout (handles token revocation and state cleanup)
      await logout();

      // Redirect to login page (industry standard)
      navigate("/login");
    } catch (error) {
      // Log error but still redirect (state is already cleared)
      console.error("Logout error:", error);
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Box>
      <PanelHeader
        title="My Account"
        description="Manage your account settings and preferences"
      />

      <Paper sx={{ p: 3, mt: 3, maxWidth: 600, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Avatar
            sx={{ width: 100, height: 100, mb: 2, bgcolor: "primary.main" }}
          >
            <PersonIcon sx={{ fontSize: 60 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom sx={{ color: "primary.main" }}>
            {capitalizeName(displayUser.name)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {displayUser.email}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <List>
          <ListItem>
            <ListItemText
              primary="Account Type"
              secondary={
                (displayUser.role || "User").charAt(0).toUpperCase() +
                (displayUser.role || "User").slice(1)
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Member Since"
              secondary={formatDate(displayUser.memberSince || displayUser.created_at)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Last Active"
              secondary={formatDate(displayUser.lastLogin || new Date().toISOString())}
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate("/settings")}
          >
            Settings
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
