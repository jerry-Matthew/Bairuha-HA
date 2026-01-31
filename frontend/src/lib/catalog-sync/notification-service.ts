/**
 * Catalog Sync Notification Service
 * 
 * Creates notifications for catalog updates (new integrations, updated integrations, etc.)
 */

import { createNotification } from '@/components/globalAdd/server/notification.service';
import { ChangeDetectionResult } from './change-detector';

export interface UpdateNotification {
  type: 'new_integration' | 'updated_integration' | 'deprecated_integration';
  domain: string;
  name: string;
  changes?: string[]; // For updated integrations
  syncId: string;
}

/**
 * Send notifications for catalog updates
 */
export async function notifyCatalogUpdates(
  changes: ChangeDetectionResult,
  syncId: string
): Promise<void> {
  // Create notification for new integrations (batch notification)
  if (changes.new.length > 0) {
    const integrationNames = changes.new.slice(0, 5).map(e => e.name);
    const moreCount = changes.new.length > 5 ? changes.new.length - 5 : 0;
    const message = moreCount > 0
      ? `${integrationNames.join(', ')} and ${moreCount} more`
      : integrationNames.join(', ');

    await createNotification({
      userId: null, // Broadcast to all users
      type: 'info',
      title: `New Integrations Available`,
      message: `${changes.new.length} new integration${changes.new.length > 1 ? 's' : ''} added: ${message}`,
      actionUrl: '/integrations',
      actionLabel: 'View Integrations',
      metadata: {
        syncId,
        type: 'catalog_update',
        updateType: 'new_integrations',
        count: changes.new.length,
        domains: changes.new.map(e => e.domain),
      },
    });
  }

  // Create notification for updated integrations (batch notification)
  if (changes.updated.length > 0) {
    const integrationNames = changes.updated.slice(0, 5).map(c => c.newEntry.name);
    const moreCount = changes.updated.length > 5 ? changes.updated.length - 5 : 0;
    const message = moreCount > 0
      ? `${integrationNames.join(', ')} and ${moreCount} more`
      : integrationNames.join(', ');

    await createNotification({
      userId: null, // Broadcast to all users
      type: 'info',
      title: `Integration Updates Available`,
      message: `${changes.updated.length} integration${changes.updated.length > 1 ? 's' : ''} updated: ${message}`,
      actionUrl: '/integrations',
      actionLabel: 'View Updates',
      metadata: {
        syncId,
        type: 'catalog_update',
        updateType: 'updated_integrations',
        count: changes.updated.length,
        domains: changes.updated.map(c => c.domain),
      },
    });
  }

  // Create notification for deprecated integrations (warning)
  if (changes.deleted.length > 0) {
    const integrationNames = changes.deleted.slice(0, 5).map(e => e.name);
    const moreCount = changes.deleted.length > 5 ? changes.deleted.length - 5 : 0;
    const message = moreCount > 0
      ? `${integrationNames.join(', ')} and ${moreCount} more`
      : integrationNames.join(', ');

    await createNotification({
      userId: null, // Broadcast to all users
      type: 'warning',
      title: `Integrations Deprecated`,
      message: `${changes.deleted.length} integration${changes.deleted.length > 1 ? 's' : ''} removed from Home Assistant: ${message}`,
      actionUrl: '/integrations?filter=deprecated',
      actionLabel: 'View Deprecated',
      metadata: {
        syncId,
        type: 'catalog_update',
        updateType: 'deprecated_integrations',
        count: changes.deleted.length,
        domains: changes.deleted.map(e => e.domain),
      },
    });
  }
}

/**
 * Create notification for new integration (individual)
 */
export async function createNewIntegrationNotification(
  domain: string,
  name: string,
  syncId: string
): Promise<void> {
  await createNotification({
    userId: null, // Broadcast to all users
    type: 'info',
    title: `New Integration: ${name}`,
    message: `The ${name} integration is now available.`,
    actionUrl: `/integrations/${domain}`,
    actionLabel: 'View Integration',
    metadata: {
      syncId,
      type: 'catalog_update',
      updateType: 'new_integration',
      domain,
    },
  });
}

/**
 * Create notification for updated integration (individual)
 */
export async function createUpdatedIntegrationNotification(
  domain: string,
  name: string,
  changes: string[],
  syncId: string
): Promise<void> {
  const changesText = changes.length > 0 ? ` (${changes.join(', ')})` : '';

  await createNotification({
    userId: null, // Broadcast to all users
    type: 'info',
    title: `Integration Updated: ${name}`,
    message: `The ${name} integration has been updated${changesText}.`,
    actionUrl: `/integrations/${domain}`,
    actionLabel: 'View Changes',
    metadata: {
      syncId,
      type: 'catalog_update',
      updateType: 'updated_integration',
      domain,
      changedFields: changes,
    },
  });
}
