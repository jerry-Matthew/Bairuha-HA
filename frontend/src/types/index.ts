export interface Entity {
  id: string;
  deviceId: string;
  entityId: string;      // e.g. "light.living_room"
  domain: string;        // e.g. "light", "sensor", "switch" - this is the EntityType
  name?: string;
  icon?: string;         // Icon identifier (e.g. "mdi:lightbulb")
  state: string;         // Current state (e.g. "on", "off", "72°F", "unknown")
  attributes: Record<string, any>;  // Additional state data
  lastChanged?: string;  // ISO timestamp
  lastUpdated: string;   // ISO timestamp
  createdAt: string;     // ISO timestamp
}

export type EntityType =
  | "light"
  | "climate"
  | "lock"
  | "door"
  | "sensor"
  | "binary_sensor"
  | "switch"
  | "cover"
  | "camera"
  | "media_player";

/**
 * Entity State Changed Event
 * This event is emitted when an entity's state changes
 * Used for future WebSocket integration
 */
export interface EntityStateChangedEvent {
  entityId: string;      // Full entity ID (e.g. "light.living_room")
  state: string;
  attributes: Record<string, any>;
  lastChanged: string;   // ISO timestamp
  lastUpdated: string;   // ISO timestamp
}

export interface ActivityEvent {
  id: string;
  time: string;
  timestamp: number;
  entity: string;
  entityId: string;
  action: string;
  area: string;
  type: "state_change" | "trigger" | "action";
}

export interface EnergyData {
  time: string;
  consumption: number;
  production: number;
}

export interface HistoryQuery {
  entity: string;
  dateRange: "1h" | "24h" | "7d" | "30d";
  startTime?: Date;
  endTime?: Date;
}

export interface SystemSettings {
  name: string;
  location: string;
  timezone: string;
  unitSystem: "imperial" | "metric";
  darkMode: boolean;
  notifications: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  memberSince: string;
  lastLogin: string;
  is_active?: boolean;
  created_at?: string;
}

