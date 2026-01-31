import { useState, useEffect } from "react";
import type { Entity } from "@/types";

// Extended Entity type that includes source field from API
interface EntityWithSource extends Entity {
  source?: "ha" | "internal" | "hybrid";
  ha_entity_id?: string;
}

interface StateInspectionFilters {
  domain?: string;
  deviceId?: string;
  state?: string;
  source?: "ha" | "internal" | "hybrid";
  limit?: number;
  offset?: number;
}

interface StateInspectionResponse {
  entities: EntityWithSource[];
  total: number;
  filters: Partial<StateInspectionFilters>;
}

export function useStateInspection() {
  const [entities, setEntities] = useState<EntityWithSource[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = async (filters: StateInspectionFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.domain) params.append("domain", filters.domain);
      if (filters.deviceId) params.append("device_id", filters.deviceId);
      if (filters.state) params.append("state", filters.state);
      if (filters.source) params.append("source", filters.source);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());

      const url = `/api/dev-tools/entities${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch entities");
      }

      const data: StateInspectionResponse = await response.json();
      setEntities(data.entities || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch entities");
      setEntities([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityDetail = async (entityId: string): Promise<EntityWithSource | null> => {
    try {
      const response = await fetch(`/api/dev-tools/entities/${encodeURIComponent(entityId)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch entity detail");
      }
      const data = await response.json();
      return data.entity || null;
    } catch (err) {
      console.error("Failed to fetch entity detail:", err);
      return null;
    }
  };

  return {
    entities,
    total,
    loading,
    error,
    fetchEntities,
    fetchEntityDetail,
  };
}
