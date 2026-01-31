/**
 * Catalog Sync API Tests
 * 
 * Tests for sync API endpoints
 */

import { POST, GET } from '../route';
import { NextRequest } from 'next/server';
import { syncCatalog, isSyncInProgress } from '@/lib/catalog-sync/sync-orchestrator';
import { query } from '@/lib/db';

jest.mock('@/lib/catalog-sync/sync-orchestrator');
jest.mock('@/lib/db');

const mockSyncCatalog = syncCatalog as jest.MockedFunction<typeof syncCatalog>;
const mockIsSyncInProgress = isSyncInProgress as jest.MockedFunction<typeof isSyncInProgress>;
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Catalog Sync API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/catalog/sync', () => {
    it('starts sync successfully', async () => {
      mockIsSyncInProgress.mockReturnValue(false);
      mockQuery.mockResolvedValue({
        rows: [{ id: 'sync-123' }],
        rowCount: 1,
      } as any);

      mockSyncCatalog.mockResolvedValue({
        syncId: 'sync-123',
        status: 'completed',
        total: 100,
        new: 10,
        updated: 5,
        deleted: 0,
        errors: 0,
        errorDetails: [],
        duration: 5000,
      });

      const request = new NextRequest('http://localhost:3000/api/catalog/sync', {
        method: 'POST',
        body: JSON.stringify({ type: 'incremental' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncId).toBe('sync-123');
      expect(data.status).toBe('started');
    });

    it('returns error if sync already in progress', async () => {
      mockIsSyncInProgress.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync', {
        method: 'POST',
        body: JSON.stringify({ type: 'incremental' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already in progress');
    });

    it('supports full sync type', async () => {
      mockIsSyncInProgress.mockReturnValue(false);
      mockQuery.mockResolvedValue({
        rows: [{ id: 'sync-123' }],
        rowCount: 1,
      } as any);

      mockSyncCatalog.mockResolvedValue({
        syncId: 'sync-123',
        status: 'completed',
        total: 100,
        new: 10,
        updated: 5,
        deleted: 0,
        errors: 0,
        errorDetails: [],
        duration: 5000,
      });

      const request = new NextRequest('http://localhost:3000/api/catalog/sync', {
        method: 'POST',
        body: JSON.stringify({ type: 'full' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncId).toBe('sync-123');
    });

    it('handles invalid sync type', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog/sync', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid sync type');
    });
  });

  describe('GET /api/catalog/sync', () => {
    it('returns current sync status', async () => {
      mockIsSyncInProgress.mockReturnValue(true);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'sync-123',
          sync_type: 'incremental',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: null,
          status: 'running',
          total_integrations: 100,
          new_integrations: 10,
          updated_integrations: 5,
          deleted_integrations: 0,
          error_count: 0,
        }],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'sync-122',
          sync_type: 'incremental',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T01:00:00Z',
          status: 'completed',
          total_integrations: 100,
          new_integrations: 10,
          updated_integrations: 5,
          deleted_integrations: 0,
          error_count: 0,
        }],
        rowCount: 1,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current).toBeDefined();
      expect(data.lastSync).toBeDefined();
      expect(data.syncInProgress).toBe(true);
    });

    it('returns specific sync details when syncId provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'sync-123',
          sync_type: 'incremental',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T01:00:00Z',
          status: 'completed',
          total_integrations: 100,
          new_integrations: 10,
          updated_integrations: 5,
          deleted_integrations: 0,
          error_count: 0,
          error_details: [],
          metadata: {},
        }],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          domain: 'test',
          change_type: 'new',
          previous_version_hash: null,
          new_version_hash: 'hash',
          changed_fields: ['name'],
          created_at: '2024-01-01T00:00:00Z',
        }],
        rowCount: 1,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync?syncId=sync-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sync).toBeDefined();
      expect(data.changes).toBeDefined();
    });

    it('returns 404 for non-existent sync', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync?syncId=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });
});
