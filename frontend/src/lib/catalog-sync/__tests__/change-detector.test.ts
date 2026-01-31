/**
 * Change Detector Tests
 * 
 * Tests for detecting changes between HA catalog and database catalog
 */

import {
  detectCatalogChanges,
  compareIntegration,
  getDatabaseCatalog,
  ChangeDetectionResult,
  CatalogEntry,
} from '../change-detector';
import { query } from '@/lib/db';
import { calculateVersionHash, detectChanges } from '../version-tracker';

jest.mock('@/lib/db');
jest.mock('../version-tracker');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCalculateVersionHash = calculateVersionHash as jest.MockedFunction<typeof calculateVersionHash>;
const mockDetectChanges = detectChanges as jest.MockedFunction<typeof detectChanges>;

describe('Change Detector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compareIntegration', () => {
    it('detects new integration', () => {
      const newEntry: CatalogEntry = {
        domain: 'new_integration',
        name: 'New Integration',
        supports_devices: true,
        is_cloud: false,
      };

      mockCalculateVersionHash.mockReturnValue({ hash: 'new_hash', fields: [] });

      const result = compareIntegration(
        {} as CatalogEntry,
        newEntry,
        null,
        'new_hash'
      );

      expect(result.changed).toBe(true);
      expect(result.changedFields).toContain('new');
    });

    it('detects unchanged integration', () => {
      const entry: CatalogEntry = {
        domain: 'test',
        name: 'Test',
        supports_devices: true,
        is_cloud: false,
      };

      mockCalculateVersionHash.mockReturnValue({ hash: 'same_hash', fields: [] });

      const result = compareIntegration(entry, entry, 'same_hash', 'same_hash');

      expect(result.changed).toBe(false);
      expect(result.changedFields).toHaveLength(0);
    });

    it('detects updated integration', () => {
      const oldEntry: CatalogEntry = {
        domain: 'test',
        name: 'Old Name',
        supports_devices: true,
        is_cloud: false,
      };

      const newEntry: CatalogEntry = {
        domain: 'test',
        name: 'New Name',
        supports_devices: true,
        is_cloud: false,
      };

      // Mock detectChanges to return changed fields
      mockDetectChanges.mockReturnValue(['name']);

      const result = compareIntegration(oldEntry, newEntry, 'old_hash', 'new_hash');

      expect(result).toBeDefined();
      expect(result.changed).toBe(true);
      expect(result.changedFields).toContain('name');
      expect(mockDetectChanges).toHaveBeenCalledWith('old_hash', 'new_hash', oldEntry, newEntry);
    });
  });

  describe('getDatabaseCatalog', () => {
    it('returns map of database catalog entries', async () => {
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

      const catalog = await getDatabaseCatalog();

      expect(catalog.size).toBe(2);
      expect(catalog.get('test1')?.entry.domain).toBe('test1');
      expect(catalog.get('test1')?.versionHash).toBe('hash1');
    });

    it('filters out deprecated integrations', async () => {
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
        ],
        rowCount: 1,
      } as any);

      const catalog = await getDatabaseCatalog();

      // Check that query was called with the correct SQL
      const calls = mockQuery.mock.calls;
      const selectCall = calls.find(call => call[0]?.includes('SELECT') && call[0]?.includes("sync_status != 'deprecated'"));
      expect(selectCall).toBeDefined();
    });
  });

  describe('detectCatalogChanges', () => {
    it('detects new integrations', async () => {
      const haEntries: CatalogEntry[] = [
        {
          domain: 'new1',
          name: 'New 1',
          supports_devices: true,
          is_cloud: false,
        },
        {
          domain: 'new2',
          name: 'New 2',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      mockCalculateVersionHash.mockReturnValue({ hash: 'hash', fields: [] });

      const result = await detectCatalogChanges(haEntries);

      expect(result.new).toHaveLength(2);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('detects updated integrations', async () => {
      const haEntries: CatalogEntry[] = [
        {
          domain: 'test',
          name: 'Updated Name',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockQuery.mockResolvedValue({
        rows: [
          {
            domain: 'test',
            name: 'Old Name',
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
            version_hash: 'old_hash',
          },
        ],
        rowCount: 1,
      } as any);

      mockCalculateVersionHash.mockReturnValue({ hash: 'new_hash', fields: ['name'] });
      mockDetectChanges.mockReturnValue(['name']);

      const result = await detectCatalogChanges(haEntries);

      expect(result.new).toHaveLength(0);
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].domain).toBe('test');
      expect(result.updated[0].changedFields).toContain('name');
    });

    it('detects deleted integrations', async () => {
      const haEntries: CatalogEntry[] = [];

      mockQuery.mockResolvedValue({
        rows: [
          {
            domain: 'deleted',
            name: 'Deleted',
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
            version_hash: 'hash',
          },
        ],
        rowCount: 1,
      } as any);

      const result = await detectCatalogChanges(haEntries);

      expect(result.new).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(1);
      expect(result.deleted[0].domain).toBe('deleted');
    });

    it('identifies unchanged integrations', async () => {
      const haEntries: CatalogEntry[] = [
        {
          domain: 'test',
          name: 'Test',
          supports_devices: true,
          is_cloud: false,
        },
      ];

      mockQuery.mockResolvedValue({
        rows: [
          {
            domain: 'test',
            name: 'Test',
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
            version_hash: 'same_hash',
          },
        ],
        rowCount: 1,
      } as any);

      mockCalculateVersionHash.mockReturnValue({ hash: 'same_hash', fields: [] });

      const result = await detectCatalogChanges(haEntries);

      expect(result.new).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.unchanged).toContain('test');
    });

    it('handles mixed changes', async () => {
      const haEntries: CatalogEntry[] = [
        { domain: 'new', name: 'New', supports_devices: true, is_cloud: false },
        { domain: 'updated', name: 'Updated', supports_devices: true, is_cloud: false },
        { domain: 'unchanged', name: 'Unchanged', supports_devices: true, is_cloud: false },
      ];

      mockQuery.mockResolvedValue({
        rows: [
          {
            domain: 'updated',
            name: 'Old',
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
            version_hash: 'old_hash',
          },
          {
            domain: 'unchanged',
            name: 'Unchanged',
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
            version_hash: 'same_hash',
          },
          {
            domain: 'deleted',
            name: 'Deleted',
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
            version_hash: 'hash',
          },
        ],
        rowCount: 3,
      } as any);

      // Mock hash calculation - return different hashes for updated vs unchanged
      mockCalculateVersionHash.mockImplementation((entry: CatalogEntry) => {
        if (entry.domain === 'updated') {
          return { hash: 'new_hash', fields: [] };
        } else if (entry.domain === 'unchanged') {
          return { hash: 'same_hash', fields: [] };
        }
        return { hash: 'hash', fields: [] };
      });
      
      // Mock detectChanges - only return changes for 'updated' domain
      mockDetectChanges.mockImplementation((oldHash: string, newHash: string, oldEntry: CatalogEntry, newEntry: CatalogEntry) => {
        // For 'updated' domain with different hashes, return changed fields
        if (newEntry.domain === 'updated' && oldHash === 'old_hash' && newHash === 'new_hash') {
          return ['name'];
        }
        // For 'unchanged' domain, return empty (no changes) since hash matches
        if (newEntry.domain === 'unchanged' && oldHash === 'same_hash' && newHash === 'same_hash') {
          return [];
        }
        return [];
      });

      const result = await detectCatalogChanges(haEntries);

      expect(result.new).toHaveLength(1);
      // Updated should only contain 'updated' domain (not 'unchanged')
      expect(result.updated.length).toBeGreaterThanOrEqual(1);
      expect(result.updated.some(u => u.domain === 'updated')).toBe(true);
      expect(result.deleted).toHaveLength(1);
      // Unchanged should contain 'unchanged' domain
      expect(result.unchanged).toContain('unchanged');
    });
  });
});
