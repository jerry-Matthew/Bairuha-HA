/**
 * Version Tracker Tests
 * 
 * Tests for version hash calculation and storage
 */

import {
  calculateVersionHash,
  storeVersionHash,
  getCurrentVersionHash,
  getVersionHashesForDomains,
  CatalogEntry,
} from '../version-tracker';
import { query } from '@/lib/db';

jest.mock('@/lib/db');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Version Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateVersionHash', () => {
    it('calculates deterministic hash for same entry', () => {
      const entry: CatalogEntry = {
        domain: 'test',
        name: 'Test Integration',
        description: 'Test description',
        icon: 'mdi:test',
        supports_devices: true,
        is_cloud: false,
        documentation_url: 'https://example.com',
        flow_type: 'manual',
      };

      const hash1 = calculateVersionHash(entry);
      const hash2 = calculateVersionHash(entry);

      expect(hash1.hash).toBe(hash2.hash);
      expect(hash1.hash).toHaveLength(64); // SHA256 hex length
    });

    it('produces different hash for different entries', () => {
      const entry1: CatalogEntry = {
        domain: 'test1',
        name: 'Test 1',
        supports_devices: true,
        is_cloud: false,
      };

      const entry2: CatalogEntry = {
        domain: 'test2',
        name: 'Test 2',
        supports_devices: true,
        is_cloud: false,
      };

      const hash1 = calculateVersionHash(entry1);
      const hash2 = calculateVersionHash(entry2);

      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('includes all relevant fields in hash', () => {
      const entry: CatalogEntry = {
        domain: 'test',
        name: 'Test',
        description: 'Description',
        icon: 'mdi:icon',
        supports_devices: true,
        is_cloud: false,
        documentation_url: 'https://example.com',
        flow_type: 'manual',
        flow_config: { test: 'value' },
        handler_class: 'TestHandler',
        metadata: { key: 'value' },
      };

      const hash = calculateVersionHash(entry);

      expect(hash.fields).toContain('name');
      expect(hash.fields).toContain('description');
      expect(hash.fields).toContain('icon');
      expect(hash.fields).toContain('flow_type');
      expect(hash.fields).toContain('flow_config');
    });

    it('handles null and undefined values', () => {
      const entry1: CatalogEntry = {
        domain: 'test',
        name: 'Test',
        supports_devices: true,
        is_cloud: false,
        description: undefined,
        icon: undefined,
      };

      const entry2: CatalogEntry = {
        domain: 'test',
        name: 'Test',
        supports_devices: true,
        is_cloud: false,
        description: null as any,
        icon: null as any,
      };

      const hash1 = calculateVersionHash(entry1);
      const hash2 = calculateVersionHash(entry2);

      expect(hash1.hash).toBe(hash2.hash);
    });

    it('detects changes in flow_config', () => {
      const entry1: CatalogEntry = {
        domain: 'test',
        name: 'Test',
        supports_devices: true,
        is_cloud: false,
        flow_config: { key: 'value1' },
      };

      const entry2: CatalogEntry = {
        domain: 'test',
        name: 'Test',
        supports_devices: true,
        is_cloud: false,
        flow_config: { key: 'value2' },
      };

      const hash1 = calculateVersionHash(entry1);
      const hash2 = calculateVersionHash(entry2);

      expect(hash1.hash).not.toBe(hash2.hash);
    });
  });

  describe('storeVersionHash', () => {
    it('stores version hash in database', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await storeVersionHash('test', 'abc123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE integration_catalog'),
        ['abc123', 'test']
      );
    });

    it('updates last_synced_at timestamp', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as any);

      await storeVersionHash('test', 'abc123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_synced_at'),
        expect.any(Array)
      );
    });
  });

  describe('getCurrentVersionHash', () => {
    it('returns hash for existing integration', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ version_hash: 'abc123' }],
        rowCount: 1,
      } as any);

      const hash = await getCurrentVersionHash('test');

      expect(hash).toBe('abc123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT version_hash'),
        ['test']
      );
    });

    it('returns null for non-existent integration', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const hash = await getCurrentVersionHash('nonexistent');

      expect(hash).toBeNull();
    });
  });

  describe('getVersionHashesForDomains', () => {
    it('returns map of domains to version hashes', async () => {
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

      const result = await getVersionHashesForDomains(['test1', 'test2']);

      expect(result.size).toBe(2);
      expect(result.get('test1')?.versionHash).toBe('hash1');
      expect(result.get('test2')?.versionHash).toBe('hash2');
    });

    it('handles empty domain list', async () => {
      const result = await getVersionHashesForDomains([]);

      expect(result.size).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('handles missing integrations gracefully', async () => {
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

      const result = await getVersionHashesForDomains(['test1', 'test2']);

      expect(result.size).toBe(1);
      expect(result.has('test1')).toBe(true);
      expect(result.has('test2')).toBe(false);
    });
  });
});
