/**
 * HACS Mock Database
 * 
 * In production, this would be PostgreSQL
 * This is a shared mock database for all HACS API routes
 */

import type { HacsExtension } from "@/components/hacs/server/hacs.types";

// Mock in-memory database
const mockDatabase = new Map<string, HacsExtension>();

export function getIntegration(id: string): HacsExtension | null {
  return mockDatabase.get(id) || null;
}

export function saveIntegration(integration: HacsExtension): void {
  mockDatabase.set(integration.id, integration);
}

export function getAllIntegrations(): HacsExtension[] {
  return Array.from(mockDatabase.values());
}

export function deleteIntegration(id: string): boolean {
  return mockDatabase.delete(id);
}

