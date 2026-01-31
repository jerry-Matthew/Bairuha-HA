/**
 * Sync Service Tests
 * 
 * Tests for sync orchestration and execution
 */

import {
  startSync,
  completeSync,
  failSync,
  performIncrementalSync,
  performFullSync,
  recordChange,
  isSyncInProgress,
  getCurrentSyncId,
  __resetSyncState,
} from '../sync-service';
import { query, transaction } from '@/lib/db';
import { calculateVersionHash, storeVersionHash } from '../version-tracker';
import { detectCatalogChanges } from '../change-detector';

jest.mock('@/lib/db');
jest.mock('../version-tracker');
jest.mock('../change-detector');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;
const mockCalculateVersionHash = calculateVersionHash as jest.MockedFunction<typeof calculateVersionHash>;
const mockStoreVersionHash = storeVersionHash as jest.MockedFunction<typeof storeVersionHash>;
const mockDetectCatalogChanges = detectCatalogChanges as jest.MockedFunction<typeof detectCatalogChanges>;

describe('Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset sync state
    __resetSyncState();
  });

  describe('startSync', () => {
    it('creates sync history record', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 'sync-123' }],
        rowCount: 1,
      } as any);

      const syncId = await startSync('incremental');

      expect(syncId).toBe('sync-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO catalog_sync_history'),
        ['incremental']
      );
    });

    it('prevents concurrent syncs', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 'sync-123' }],
        rowCount: 1,
      } as any);

      await startSync('incremental');

      await expect(startSync('incremental')).rejects.toThrow('Sync already in progress');
    });

    it('supports different sync types', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 'sync-123' }],
        rowCount: 1,
      } as any);

      await startSync('full');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['full']
      );
    });
  });

  describe('completeSync', () => {
    it('updates sync history with results', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      } as any);

      const result = {
        syncId: 'sync-123',
        status: 'completed' as const,
        total: 100,
        new: 10,
        updated: 5,
        deleted: 2,
        errors: 0,
        errorDetails: [],
        duration: 5000,
      };

      await completeSync('sync-123', result);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE catalog_sync_history'),
        expect.arrayContaining([
          'completed',
          100,
          10,
          5,
          2,
          0,
          'sync-123',
        ])
      );
    });

    it('records error details', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      } as any);

      const result = {
        syncId: 'sync-123',
        status: 'completed' as const,
        total: 100,
        new: 10,
        updated: 5,
        deleted: 0,
        errors: 2,
        errorDetails: [
          { domain: 'test1', error: 'Error 1' },
          { domain: 'test2', error: 'Error 2' },
        ],
        duration: 5000,
      };

      await completeSync('sync-123', result);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(String), // status
          expect.any(Number), // total
          expect.any(Number), // new
          expect.any(Number), // updated
          expect.any(Number), // deleted
          2, // errors
          expect.stringContaining('test1'), // error details JSON
          'sync-123',
        ])
      );
    });
  });

  describe('failSync', () => {
    it('records sync failure', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      } as any);

      const error = new Error('Sync failed');

      await failSync('sync-123', error);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        expect.arrayContaining(['sync-123'])
      );
    });

    it('records partial results if provided', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      } as any);

      const error = new Error('Sync failed');
      const partialResult = {
        total: 50,
        new: 5,
        updated: 2,
        deleted: 0,
        errors: 1,
        errorDetails: [{ domain: 'test', error: 'Error' }],
      };

      await failSync('sync-123', error, partialResult);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(Number), // error count
          expect.stringContaining('test'), // error details
          50, // total
          5, // new
          2, // updated
          0, // deleted
          'sync-123',
        ])
      );
    });
  });

  describe('performIncrementalSync', () => {
    it('processes only changed integrations', async () => {
      const haEntries = [
        {
          domain: 'new1',
          name: 'New 1',
          supports_devices: true,
          is_cloud: false,
        },
        {
          domain: 'updated1',
          name: 'Updated',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockDetectCatalogChanges.mockResolvedValue({
        new: [{ domain: 'new1', name: 'New 1', supports_devices: true, is_cloud: false }],
        updated: [{
          domain: 'updated1',
          oldEntry: { domain: 'updated1', name: 'Old', supports_devices: true, is_cloud: false },
          newEntry: { domain: 'updated1', name: 'Updated', supports_devices: true, is_cloud: false },
          changedFields: ['name'],
        }],
        deleted: [],
        unchanged: [],
      });

      mockQuery.mockResolvedValue({
        rows: [{ version_hash: null }],
        rowCount: 1,
      } as any);

      mockCalculateVersionHash.mockReturnValue({ hash: 'hash', fields: [] });
      mockStoreVersionHash.mockResolvedValue();
      mockTransaction.mockImplementation(async (callback: any) => {
        return await callback({
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        });
      });

      const result = await performIncrementalSync('sync-123', haEntries);

      expect(result.new).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.deleted).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('handles errors gracefully', async () => {
      const haEntries = [
        {
          domain: 'error',
          name: 'Error',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockDetectCatalogChanges.mockResolvedValue({
        new: [haEntries[0]],
        updated: [],
        deleted: [],
        unchanged: [],
      });

      mockQuery.mockRejectedValue(new Error('Database error'));

      const result = await performIncrementalSync('sync-123', haEntries);

      expect(result.errors).toBeGreaterThan(0);
      expect(result.errorDetails.length).toBeGreaterThan(0);
    });
  });

  describe('performFullSync', () => {
    it('processes all integrations', async () => {
      const haEntries = [
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
        rows: [],
        rowCount: 0,
      } as any);

      mockCalculateVersionHash.mockReturnValue({ hash: 'hash', fields: [] });
      mockStoreVersionHash.mockResolvedValue();
      mockTransaction.mockImplementation(async (callback: any) => {
        return await callback({
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        });
      });

      const result = await performFullSync('sync-123', haEntries);

      expect(result.total).toBe(2);
      expect(result.new).toBe(2);
    });
  });

  describe('recordChange', () => {
    it('records integration change', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
      } as any);

      await recordChange('sync-123', 'test', 'new', null, 'hash', ['name']);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO catalog_sync_changes'),
        ['sync-123', 'test', 'new', null, 'hash', expect.any(String)]
      );
    });
  });

  describe('sync state management', () => {
    it('tracks sync in progress', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 'sync-123' }],
        rowCount: 1,
      } as any);

      expect(isSyncInProgress()).toBe(false);

      await startSync('incremental');

      expect(isSyncInProgress()).toBe(true);
      expect(getCurrentSyncId()).toBe('sync-123');
    });

    it('clears sync state on completion', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 'sync-123' }],
        rowCount: 1,
      } as any);

      await startSync('incremental');
      await completeSync('sync-123', {
        syncId: 'sync-123',
        status: 'completed',
        total: 0,
        new: 0,
        updated: 0,
        deleted: 0,
        errors: 0,
        errorDetails: [],
        duration: 0,
      });

      expect(isSyncInProgress()).toBe(false);
      expect(getCurrentSyncId()).toBeNull();
    });
  });
});
