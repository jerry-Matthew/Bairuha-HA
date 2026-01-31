"use client";

import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
} from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectSettings } from "@/store/selectors";
import { updateSettings } from "@/store/slices/settings-slice";

export function SettingsPanel() {
  const settings = useAppSelector(selectSettings);
  const dispatch = useAppDispatch();

  const handleChange = (field: keyof typeof settings, value: unknown) => {
    dispatch(updateSettings({ [field]: value }));
  };

  const handleSave = () => {
    // Save settings logic here - could persist to localStorage or API
    // For now, Zustand store persists automatically
  };

  return (
    <Box>
      <PanelHeader
        title="Settings"
        description="System configuration"
      />

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{ color: "primary.main" }}
        >
          General Settings
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="System Name"
              value={settings.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Location"
              value={settings.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Timezone"
              value={settings.timezone}
              onChange={(e) => handleChange("timezone", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Unit System"
              value={settings.unitSystem}
              onChange={(e) => handleChange("unitSystem", e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography 
          variant="h6" 
          gutterBottom
          sx={{ color: "primary.main" }}
        >
          Preferences
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.darkMode}
                onChange={(e) => handleChange("darkMode", e.target.checked)}
              />
            }
            label="Dark Mode"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications}
                onChange={(e) =>
                  handleChange("notifications", e.target.checked)
                }
              />
            }
            label="Enable Notifications"
          />
        </Box>

        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" onClick={handleSave}>
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

