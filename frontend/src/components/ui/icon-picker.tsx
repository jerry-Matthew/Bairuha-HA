"use client";

import { useState, useMemo } from "react";
import {
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  Typography,
  InputAdornment,
} from "@mui/material";
import {
  Search as SearchIcon,
  Lightbulb as LightbulbIcon,
  Group as GroupIcon,
  Home as HomeIcon,
  Room as RoomIcon,
  Kitchen as KitchenIcon,
  Bed as BedIcon,
  Bathroom as BathroomIcon,
  Garage as GarageIcon,
  Yard as YardIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  CameraAlt as CameraIcon,
  Thermostat as ThermostatIcon,
  AcUnit as AcUnitIcon,
  Tv as TvIcon,
  Speaker as SpeakerIcon,
  Computer as ComputerIcon,
  Phone as PhoneIcon,
  Window as WindowIcon,
  DoorFront as DoorIcon,
  Blinds as BlindsIcon,
  Curtains as CurtainsIcon,
  Power as PowerIcon,
  ToggleOn as SwitchIcon,
  Sensors as SensorsIcon,
  Radar as MotionIcon,
  WaterDrop as WaterIcon,
  LocalFireDepartment as FireIcon,
  ElectricBolt as ElectricIcon,
  WbSunny as SunIcon,
  DarkMode as DarkModeIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
  Build as BuildIcon,
  Extension as ExtensionIcon,
} from "@mui/icons-material";

// Common Material Design Icons for smart home groups
export const COMMON_ICONS = [
  { name: "mdi:lightbulb-group", label: "Lightbulb Group", icon: LightbulbIcon },
  { name: "mdi:group", label: "Group", icon: GroupIcon },
  { name: "mdi:home", label: "Home", icon: HomeIcon },
  { name: "mdi:room", label: "Room", icon: RoomIcon },
  { name: "mdi:kitchen", label: "Kitchen", icon: KitchenIcon },
  { name: "mdi:bed", label: "Bedroom", icon: BedIcon },
  { name: "mdi:bathroom", label: "Bathroom", icon: BathroomIcon },
  { name: "mdi:garage", label: "Garage", icon: GarageIcon },
  { name: "mdi:yard", label: "Yard", icon: YardIcon },
  { name: "mdi:security", label: "Security", icon: SecurityIcon },
  { name: "mdi:lock", label: "Lock", icon: LockIcon },
  { name: "mdi:camera", label: "Camera", icon: CameraIcon },
  { name: "mdi:thermostat", label: "Thermostat", icon: ThermostatIcon },
  { name: "mdi:ac-unit", label: "AC Unit", icon: AcUnitIcon },
  { name: "mdi:tv", label: "TV", icon: TvIcon },
  { name: "mdi:speaker", label: "Speaker", icon: SpeakerIcon },
  { name: "mdi:computer", label: "Computer", icon: ComputerIcon },
  { name: "mdi:phone", label: "Phone", icon: PhoneIcon },
  { name: "mdi:window", label: "Window", icon: WindowIcon },
  { name: "mdi:door", label: "Door", icon: DoorIcon },
  { name: "mdi:blinds", label: "Blinds", icon: BlindsIcon },
  { name: "mdi:curtains", label: "Curtains", icon: CurtainsIcon },
  { name: "mdi:power", label: "Power", icon: PowerIcon },
  { name: "mdi:switch", label: "Switch", icon: SwitchIcon },
  { name: "mdi:sensors", label: "Sensors", icon: SensorsIcon },
  { name: "mdi:motion", label: "Motion", icon: MotionIcon },
  { name: "mdi:water", label: "Water", icon: WaterIcon },
  { name: "mdi:fire", label: "Fire", icon: FireIcon },
  { name: "mdi:electric", label: "Electric", icon: ElectricIcon },
  { name: "mdi:sun", label: "Sun", icon: SunIcon },
  { name: "mdi:dark-mode", label: "Dark Mode", icon: DarkModeIcon },
  { name: "mdi:star", label: "Star", icon: StarIcon },
  { name: "mdi:favorite", label: "Favorite", icon: FavoriteIcon },
  { name: "mdi:settings", label: "Settings", icon: SettingsIcon },
  { name: "mdi:build", label: "Build", icon: BuildIcon },
  { name: "mdi:extension", label: "Extension", icon: ExtensionIcon },
];

interface IconPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon?: string;
}

export function IconPicker({ open, onClose, onSelect, currentIcon }: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return COMMON_ICONS;
    }

    const query = searchQuery.toLowerCase();
    return COMMON_ICONS.filter(
      (icon) =>
        icon.name.toLowerCase().includes(query) ||
        icon.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    onClose();
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Icon</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          margin="normal"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          autoFocus
        />

        <Box sx={{ mt: 2, maxHeight: 400, overflowY: "auto" }}>
          {filteredIcons.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No icons found matching "{searchQuery}"
            </Typography>
          ) : (
            <Grid container spacing={1} sx={{ mt: 1 }}>
              {filteredIcons.map((icon) => (
                <Grid size={{ xs: 4, sm: 3, md: 2 }} key={icon.name}>
                  <Paper
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      textAlign: "center",
                      border: currentIcon === icon.name ? 2 : 1,
                      borderColor:
                        currentIcon === icon.name ? "primary.main" : "divider",
                      backgroundColor:
                        currentIcon === icon.name
                          ? "action.selected"
                          : "background.paper",
                      "&:hover": {
                        backgroundColor: "action.hover",
                        borderColor: "primary.main",
                      },
                      transition: "all 0.2s",
                    }}
                    onClick={() => handleSelect(icon.name)}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: "2rem",
                          color: "primary.main",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <icon.icon sx={{ fontSize: "inherit", color: "inherit" }} />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.65rem",
                          textAlign: "center",
                          wordBreak: "break-word",
                        }}
                      >
                        {icon.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.55rem",
                          color: "text.secondary",
                          fontFamily: "monospace",
                        }}
                      >
                        {icon.name}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            onSelect("");
            onClose();
            setSearchQuery("");
          }}
          variant="outlined"
        >
          Clear Icon
        </Button>
      </DialogActions>
    </Dialog>
  );
}
