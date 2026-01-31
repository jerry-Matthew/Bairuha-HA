/**
 * Rollback Service Tests
 * 
 * Tests for snapshot creation and rollback functionality
 */

import {
  createSnapshot,
  rollbackSync,
  getSnapshot,
  cleanupSnapshots,
} from '../rollback-service';
import { query, transaction } from '@/lib/db';
import { CatalogEntry } from '../version-tracker';

jest.mock('@/lib/db');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

describe('Rollback Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('creates snapshot of current catalog', async () => {
      const mockEntries: CatalogEntry[] = [
        {
          domain: 'test1',
          name: 'Test 1',
          supports_devices: true,
          is_cloud: false,
        },
        {
          domain: 'test2',
          name: 'Test 2',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockQuery.mockResolvedValue({
        rows: [
          {
            domain: 'test1',
            name: 'Test 1',
            description: null,
            icon: null,
            supports_devices: true,
            is_cloud: false,
            documentation_url: null,
            flow_type: 'manual',
            flow_config: null,
            handler_class: null,
            metadata: null,
            brand_image_url: null,
            version_hash: 'hash1',
          },
          {
            domain: 'test2',
            name: 'Test 2',
            description: null,
            icon: null,
            supports_devices: true,
            is_cloud: false,
            documentation_url: null,
            flow_type: 'manual',
            flow_config: null,
            handler_class: null,
            metadata: null,
            brand_image_url: null,
            version_hash: 'hash2',
          },
        ],
        rowCount: 2,
      } as any);

      await createSnapshot('sync-123');

      // Check that SELECT query was called
      const selectCall = mockQuery.mock.calls.find(call => call[0]?.includes('SELECT'));
      expect(selectCall).toBeDefined();

      // Check that UPDATE query was called with snapshot
      const updateCall = mockQuery.mock.calls.find(call => 
        call[0]?.includes('UPDATE catalog_sync_history') && 
        call[0]?.includes('snapshot')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall?.[1]).toContain('sync-123');
    });

    it('excludes deprecated integrations from snapshot', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      await createSnapshot('sync-123');

      // Check that query includes deprecated filter
      const selectCall = mockQuery.mock.calls.find(call => 
        call[0]?.includes('SELECT') && call[0]?.includes("sync_status != 'deprecated'")
      );
      expect(selectCall).toBeDefined();
    });
  });

  describe('getSnapshot', () => {
    it('retrieves snapshot for sync', async () => {
      const snapshot: CatalogEntry[] = [
        {
          domain: 'test',
          name: 'Test',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockQuery.mockResolvedValue({
        rows: [{
          metadata: { snapshot: snapshot },
        }],
        rowCount: 1,
      } as any);

      const result = await getSnapshot('sync-123');

      expect(result).toEqual(snapshot);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT metadata'),
        ['sync-123']
      );
    });

    it('returns null if snapshot not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await getSnapshot('sync-123');

      expect(result).toBeNull();
    });

    it('returns null if metadata missing', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          metadata: null,
        }],
        rowCount: 1,
      } as any);

      const result = await getSnapshot('sync-123');

      expect(result).toBeNull();
    });
  });

  describe('rollbackSync', () => {
    it('rolls back sync to previous state', async () => {
      const snapshot: CatalogEntry[] = [
        {
          domain: 'test',
          name: 'Test',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: [{
          metadata: { snapshot: snapshot },
        }],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      mockTransaction.mockImplementation(async (callback: any) => {
        return await callback({
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        });
      });

      await rollbackSync('sync-123');

      // Check that update was called (may be called multiple times)
      const updateCalls = mockQuery.mock.calls.filter(call => 
        call[0]?.includes('UPDATE catalog_sync_history') && call[0]?.includes('cancelled')
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it('throws error if snapshot not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(rollbackSync('sync-123')).rejects.toThrow('No snapshot found');
    });

    it('restores entries from snapshot', async () => {
      const snapshot: CatalogEntry[] = [
        {
          domain: 'test',
          name: 'Test',
          supports_devices: true,
          is_cloud: false,
          flow_type: 'manual',
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: [{
          metadata: { snapshot: snapshot },
        }],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      const mockClientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      mockTransaction.mockImplementation(async (callback: any) => {
        return await callback({
          query: mockClientQuery,
        });
      });

      await rollbackSync('sync-123');

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO integration_catalog'),
        expect.any(Array)
      );
    });
  });

  describe('cleanupSnapshots', () => {
    it('keeps last N snapshots', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 'sync-1' },
          { id: 'sync-2' },
          { id: 'sync-3' },
        ],
        rowCount: 3,
      } as any);

      await cleanupSnapshots(2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET'),
        [2]
      );

      expect(mockQuery).toHaveBeenCalledTimes(4); // SELECT + 3 UPDATEs
    });

    it('handles empty snapshots gracefully', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      await cleanupSnapshots(10);

      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
