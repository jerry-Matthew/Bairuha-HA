/**
 * Catalog Sync Rollback API Tests
 * 
 * Tests for rollback endpoint
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { rollbackSync } from '@/lib/catalog-sync/rollback-service';
import { query } from '@/lib/db';

jest.mock('@/lib/catalog-sync/rollback-service');
jest.mock('@/lib/db');

const mockRollbackSync = rollbackSync as jest.MockedFunction<typeof rollbackSync>;
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Catalog Sync Rollback API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/catalog/sync/[syncId]/rollback', () => {
    it('rolls back sync successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'sync-123',
          status: 'failed',
          completed_at: '2024-01-01T01:00:00Z',
        }],
        rowCount: 1,
      } as any);

      mockRollbackSync.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/sync-123/rollback', {
        method: 'POST',
      });

      const response = await POST(request, { params: { syncId: 'sync-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRollbackSync).toHaveBeenCalledWith('sync-123');
    });

    it('returns 404 for non-existent sync', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/invalid/rollback', {
        method: 'POST',
      });

      const response = await POST(request, { params: { syncId: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('prevents rollback of running sync', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'sync-123',
          status: 'running',
          completed_at: null,
        }],
        rowCount: 1,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/sync-123/rollback', {
        method: 'POST',
      });

      const response = await POST(request, { params: { syncId: 'sync-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('still running');
    });

    it('handles rollback errors', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'sync-123',
          status: 'failed',
          completed_at: '2024-01-01T01:00:00Z',
        }],
        rowCount: 1,
      } as any);

      mockRollbackSync.mockRejectedValue(new Error('Rollback failed'));

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/sync-123/rollback', {
        method: 'POST',
      });

      const response = await POST(request, { params: { syncId: 'sync-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
