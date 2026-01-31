import { useState } from "react";

interface StatisticsFilters {
  domain?: string;
  deviceId?: string;
  entityId?: string;
  timeRange?: string;
  limit?: number;
  offset?: number;
}

interface EntityStatistics {
  entityId: string;
  entityName: string;
  domain: string;
  stateChangeCount: number;
  currentState: string;
  lastChanged: string;
  lastUpdated: string;
  uptimePercentage: number;
  averageStateDuration: string;
  mostCommonState: string;
  stateDistribution: Record<string, number>;
}

interface DomainStatistics {
  domain: string;
  entityCount: number;
  totalStateChanges: number;
  averageStateChanges: number;
  mostActiveEntity: string;
}

interface DeviceStatistics {
  deviceId: string;
  deviceName: string;
  entityCount: number;
  totalStateChanges: number;
  averageStateChanges: number;
}

interface SummaryStatistics {
  totalEntities: number;
  totalStateChanges: number;
  mostActiveEntity: string;
  mostActiveDomain: string;
  averageStateChangesPerEntity: number;
  timeRange: {
    start: string;
    end: string;
  };
}

export function useStatistics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entityStatistics, setEntityStatistics] = useState<EntityStatistics[]>([]);
  const [domainStatistics, setDomainStatistics] = useState<DomainStatistics[]>([]);
  const [deviceStatistics, setDeviceStatistics] = useState<DeviceStatistics[]>([]);
  const [summaryStatistics, setSummaryStatistics] = useState<SummaryStatistics | null>(null);
  const [total, setTotal] = useState(0);
  const [timeRange, setTimeRange] = useState<{ start: string; end: string } | null>(null);

  const fetchEntityStatistics = async (filters: StatisticsFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.domain) params.append('domain', filters.domain);
      if (filters.deviceId) params.append('device_id', filters.deviceId);
      if (filters.entityId) params.append('entity_id', filters.entityId);
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters.offset !== undefined) params.append('offset', filters.offset.toString());

      const url = `/api/dev-tools/statistics/entities${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch entity statistics');
      }

      const data = await response.json();
      setEntityStatistics(data.statistics || []);
      setTotal(data.total || 0);
      setTimeRange(data.timeRange || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entity statistics');
      setEntityStatistics([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomainStatistics = async (timeRange?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);

      const url = `/api/dev-tools/statistics/domains${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch domain statistics');
      }

      const data = await response.json();
      setDomainStatistics(data.domainStatistics || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch domain statistics');
      setDomainStatistics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceStatistics = async (timeRange?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);

      const url = `/api/dev-tools/statistics/devices${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch device statistics');
      }

      const data = await response.json();
      setDeviceStatistics(data.deviceStatistics || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch device statistics');
      setDeviceStatistics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryStatistics = async (timeRange?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);

      const url = `/api/dev-tools/statistics/summary${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch summary statistics');
      }

      const data = await response.json();
      setSummaryStatistics(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary statistics');
      setSummaryStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    entityStatistics,
    domainStatistics,
    deviceStatistics,
    summaryStatistics,
    total,
    timeRange,
    fetchEntityStatistics,
    fetchDomainStatistics,
    fetchDeviceStatistics,
    fetchSummaryStatistics,
  };
}
