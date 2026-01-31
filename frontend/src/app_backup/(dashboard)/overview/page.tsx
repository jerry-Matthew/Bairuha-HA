"use client";

import React, { useEffect, useState } from "react";
import DashboardRenderer from "@/components/dashboards/client/DashboardRenderer";
import { Typography } from "@mui/material";

export default function OverviewPage() {
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      // 1. Try to find 'overview' dashboard
      console.log("Fetching dashboards...");
      const res = await fetch("/api/dashboards");

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch dashboards: ${res.status} ${text}`);
      }

      const dashboards = await res.json();
      console.log("Dashboards fetched:", dashboards);
      const overview = dashboards.find((d: any) => d.url_path === "overview");

      if (overview) {
        console.log("Found overview dashboard:", overview.id);
        setDashboardId(overview.id);
      } else {
        console.log("Creating overview dashboard...");
        // 2. Create if missing
        const createRes = await fetch("/api/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Overview", url_path: "overview" })
        });

        if (!createRes.ok) {
          const text = await createRes.text();
          throw new Error(`Failed to create dashboard: ${createRes.status} ${text}`);
        }

        const newDashboard = await createRes.json();
        console.log("Created overview dashboard:", newDashboard.id);
        setDashboardId(newDashboard.id);
      }
    } catch (err: any) {
      console.error("Dashboard initialization error:", err);
      setError(err.message || "Unknown error occurring");
    }
  };

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        <Typography variant="h5">Error Loading Dashboard</Typography>
        <Typography sx={{ mt: 2, mb: 2 }}>{error}</Typography>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  if (!dashboardId) return <Typography sx={{ p: 4 }}>Loading Dashboard...</Typography>;

  return <DashboardRenderer dashboardId={dashboardId} />;
}
