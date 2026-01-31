"use client";

import { Box, Paper, CircularProgress } from "@mui/material";
import React, { Suspense } from "react";
import { PanelHeader } from "@/components/ui/panel-header";

// Dynamically import the map component to avoid SSR issues
const MapComponent = React.lazy(() => import("./map-component").then((mod) => ({ default: mod.MapComponent })));

export function MapPanel() {
  return (
    <Box>
      <PanelHeader
        title="Map"
        description="Spatial awareness of entities"
      />

      <Paper
        sx={{
          height: "calc(100vh - 200px)",
          minHeight: 600,
          mt: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}>
          <MapComponent />
        </Suspense>
      </Paper>
    </Box>
  );
}

