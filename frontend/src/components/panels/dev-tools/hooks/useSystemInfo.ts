import { useState, useEffect } from "react";

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime?: number;
  connections?: number;
  lastChecked?: string;
}

interface SystemInfo {
  version?: string;
  platform?: string;
  environment?: string;
  [key: string]: any;
}

interface SystemConfig {
  [key: string]: any;
}

export function useSystemInfo() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthRes, infoRes, configRes] = await Promise.all([
        fetch("/api/dev-tools/system/health"),
        fetch("/api/dev-tools/system/info"),
        fetch("/api/dev-tools/system/config"),
      ]);

      if (!healthRes.ok || !infoRes.ok || !configRes.ok) {
        throw new Error("Failed to fetch system information");
      }

      const healthData = await healthRes.json();
      const infoData = await infoRes.json();
      const configData = await configRes.json();

      setHealth({
        ...healthData,
        lastChecked: new Date().toISOString(),
      });
      setInfo(infoData);
      setConfig(configData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch system information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAll();
      }, 10000); // Refresh every 10 seconds
      setRefreshInterval(interval);
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh]);

  return {
    health,
    info,
    config,
    loading,
    error,
    autoRefresh,
    setAutoRefresh,
    refresh: fetchAll,
  };
}
