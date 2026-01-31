import type { Entity, ActivityEvent, EnergyData } from "@/types";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import LockIcon from "@mui/icons-material/Lock";
import DoorFrontIcon from "@mui/icons-material/DoorFront";

// Helper function to create entities with icons
export const createMockEntities = (): Entity[] => [
  {
    id: "1",
    name: "Living Room Light",
    state: "on",
    type: "light",
    icon: <LightbulbIcon />,
  },
  {
    id: "2",
    name: "Bedroom Thermostat",
    state: "72°F",
    type: "climate",
    icon: <ThermostatIcon />,
  },
  {
    id: "3",
    name: "Front Door",
    state: "locked",
    type: "lock",
    icon: <LockIcon />,
  },
  {
    id: "4",
    name: "Garage Door",
    state: "closed",
    type: "door",
    icon: <DoorFrontIcon />,
  },
];

export const MOCK_ENTITIES = createMockEntities();

export const MOCK_ACTIVITY_EVENTS: ActivityEvent[] = [
  {
    id: "1",
    time: "10:30 AM",
    timestamp: Date.now() - 1800000,
    entity: "Living Room Light",
    entityId: "light.living_room",
    action: "Turned on",
    area: "Living Room",
    type: "state_change",
  },
  {
    id: "2",
    time: "10:25 AM",
    timestamp: Date.now() - 2100000,
    entity: "Front Door",
    entityId: "lock.front_door",
    action: "Unlocked",
    area: "Entrance",
    type: "action",
  },
  {
    id: "3",
    time: "10:20 AM",
    timestamp: Date.now() - 2400000,
    entity: "Motion Sensor",
    entityId: "binary_sensor.motion",
    action: "Motion detected",
    area: "Kitchen",
    type: "trigger",
  },
  {
    id: "4",
    time: "10:15 AM",
    timestamp: Date.now() - 2700000,
    entity: "Thermostat",
    entityId: "climate.bedroom",
    action: "Temperature set to 72°F",
    area: "Bedroom",
    type: "state_change",
  },
];

export const MOCK_ENERGY_DATA: EnergyData[] = [
  { time: "00:00", consumption: 120, production: 0 },
  { time: "04:00", consumption: 80, production: 0 },
  { time: "08:00", consumption: 200, production: 150 },
  { time: "12:00", consumption: 180, production: 300 },
  { time: "16:00", consumption: 220, production: 250 },
  { time: "20:00", consumption: 250, production: 50 },
  { time: "24:00", consumption: 150, production: 0 },
];

export const MOCK_HISTORY_DATA = [
  { time: "00:00", temperature: 70, humidity: 45 },
  { time: "04:00", temperature: 68, humidity: 48 },
  { time: "08:00", temperature: 72, humidity: 42 },
  { time: "12:00", temperature: 75, humidity: 40 },
  { time: "16:00", temperature: 73, humidity: 43 },
  { time: "20:00", temperature: 71, humidity: 46 },
  { time: "24:00", temperature: 69, humidity: 47 },
];


