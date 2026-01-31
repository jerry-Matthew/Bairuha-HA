/**
 * Registry Types
 * 
 * Defines the data structures for all system registries
 */

export interface Device {
  id: string;
  name: string;
  integrationId: string; // Which integration provides this device
  integrationName: string; // Human-readable integration name
  model?: string;
  manufacturer?: string;
  areaId?: string; // Optional area assignment
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger?: any; // JSON structure for triggers
  condition?: any; // JSON structure for conditions
  action?: any; // JSON structure for actions
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  name: string;
  icon?: string; // Icon identifier (e.g., "mdi:home", "mdi:kitchen")
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  name: string;
  photoUrl?: string; // URL to photo
  userId?: string; // Optional link to user account
  created_at: string;
  updated_at: string;
}

export interface DeviceProvider {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}


