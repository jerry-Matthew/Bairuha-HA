/**
 * Catalog Sync History API Tests
 * 
 * Tests for sync history endpoint
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

jest.mock('@/lib/db');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Catalog Sync History API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/catalog/sync/history', () => {
    it('returns sync history', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
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
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '1' }],
        rowCount: 1,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncs).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('supports pagination', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '0' }],
        rowCount: 1,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/history?limit=10&offset=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 20])
      );
    });

    it('filters by status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '0' }],
        rowCount: 1,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/history?status=failed');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = $1"),
        ['failed']
      );
    });

    it('handles errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/catalog/sync/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
