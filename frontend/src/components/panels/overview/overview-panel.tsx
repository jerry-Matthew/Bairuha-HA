"use client";

import { useState, useEffect, useRef } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Switch,
  Box,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import { WeatherCard } from "@/components/panels/weather/weather-card";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setEntities } from "@/store/slices/entities-slice";
import { apiClient } from "@/lib/api-client";
import type { Entity } from "@/types";

// Render entity icon based on domain
const renderEntityIcon = (domain: string) => {
  // For now, we'll use text-based icons
  // In production, this would map to Material Design icons based on domain/icon field
  const iconMap: Record<string, string> = {
    light: "💡",
    switch: "🔌",
    sensor: "📊",
    binary_sensor: "📡",
    climate: "🌡️",
    lock: "🔒",
    cover: "🚪",
    camera: "📷",
    media_player: "📺",
  };
  return iconMap[domain] || "⚙️";
};

/**
 * EntityCard Component
 * 
 * Re-selects entity from Redux on every render to ensure it always has the latest state.
 * This prevents stale entity references that break real-time updates.
 */
function EntityCard({ entityId }: { entityId: string }) {
  // Re-select entity from Redux on every render - ensures we always have the latest state
  const entity = useAppSelector((state) =>
    state.entities.entities.find((e) => e.entityId === entityId)
  );

  const [isControlling, setIsControlling] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [optimisticState, setOptimisticState] = useState<string | null>(null);

  if (!entity) {
    return null;
  }

  // Use optimistic state if available, otherwise use entity state
  const displayState = optimisticState || entity.state;

  /**
   * Send command to control entity (light/switch)
   */
  const handleControl = async (newState: boolean) => {
    if (!entity.entityId) {
      setControlError("Entity ID is missing");
      return;
    }

    // Don't allow control if entity is unavailable
    if (entity.state === "unavailable") {
      setControlError("Entity is unavailable");
      setSnackbarMessage("Cannot control unavailable entity");
      setSnackbarOpen(true);
      return;
    }

    console.log("[EntityControl] Sending command:", {
      entityId: entity.entityId,
      entityName: entity.name,
      currentState: entity.state,
      newState: newState ? "on" : "off",
    });

    // Optimistic update - immediately show the new state in UI
    setOptimisticState(newState ? "on" : "off");
    setIsControlling(true);
    setControlError(null);

    try {
      const command = newState ? "turn_on" : "turn_off";

      console.log("[EntityControl] Calling API:", {
        url: "/commands",
        method: "POST",
        body: {
          entityId: entity.entityId,
          command,
          payload: {},
        },
      });

      const result = await apiClient.post<any>("/commands", {
        entityId: entity.entityId,
        command,
        payload: {},
      });

      console.log("[EntityControl] API Response:", result);

      // Show success message
      setSnackbarMessage(
        result.success
          ? `${entity.name || entity.entityId} turned ${newState ? "on" : "off"}`
          : `Command sent to ${entity.name || entity.entityId}`
      );
      setSnackbarOpen(true);

      // Clear optimistic state after a short delay to allow WebSocket update
      // If WebSocket doesn't update, the optimistic state will remain
      setTimeout(() => {
        setOptimisticState(null);
      }, 2000);
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticState(null);
      const errorMessage = error instanceof Error ? error.message : "Failed to control entity";
      setControlError(errorMessage);
      setSnackbarMessage(`Error: ${errorMessage}`);
      setSnackbarOpen(true);
      console.error("[EntityControl] Failed to control entity:", error);
    } finally {
      setIsControlling(false);
    }
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[EntityControl] Switch toggled:", {
      entityId: entity.entityId,
      checked: event.target.checked,
      currentState: entity.state,
    });
    const newState = event.target.checked;
    handleControl(newState);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.paper",
        borderRadius: 2,
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 2px 8px rgba(0, 0, 0, 0.3)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 4px 16px rgba(0, 0, 0, 0.4)"
              : "0 4px 16px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            gap: 1,
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
            >
              {renderEntityIcon(entity.domain)}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "primary.main",
                fontSize: { xs: "0.9375rem", sm: "1.25rem" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entity.name || entity.entityId}
            </Typography>
          </Box>
          {/* Show switch for controllable domains */}
          {/* CRITICAL: Derive checked directly from entity.state on every render */}
          {(entity.domain === "light" || entity.domain === "switch") && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                position: "relative",
                zIndex: 1,
              }}
              onClick={(e) => {
                // Prevent card click from interfering with switch
                e.stopPropagation();
              }}
            >
              {isControlling && (
                <CircularProgress size={20} />
              )}
              <Switch
                checked={displayState === "on"}
                onChange={handleSwitchChange}
                onClick={(e) => {
                  // Ensure switch clicks are handled
                  e.stopPropagation();
                  console.log("[EntityControl] Switch clicked directly");
                }}
                disabled={isControlling || entity.state === "unavailable"}
                color="primary"
                sx={{
                  pointerEvents: entity.state === "unavailable" ? "none" : "auto",
                }}
                title={
                  entity.state === "unavailable"
                    ? "Entity is unavailable"
                    : isControlling
                      ? "Sending command..."
                      : `Turn ${entity.state === "on" ? "off" : "on"} ${entity.name || entity.entityId}`
                }
              />
            </Box>
          )}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
          }}
        >
          Domain: <strong>{entity.domain}</strong>
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
          }}
        >
          State: <strong>{displayState}</strong>
        </Typography>
        {entity.entityId && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 1,
              display: "block",
              fontSize: { xs: "0.6875rem", sm: "0.75rem" },
              wordBreak: "break-all",
            }}
          >
            ID: {entity.entityId}
          </Typography>
        )}
        {controlError && (
          <Alert severity="error" sx={{ mt: 1, fontSize: "0.75rem" }}>
            {controlError}
          </Alert>
        )}
      </CardContent>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Card>
  );
}

export function OverviewPanel() {
  const dispatch = useAppDispatch();
  const entities = useAppSelector((state) => state.entities.entities);

  // 🧪 FORCE RENDER TEST - This will tell us if React is subscribed to Redux
  const entitiesState = useAppSelector((state) => state.entities);
  console.log("[FORCE RENDER TEST] Redux entities state:", {
    entitiesCount: entitiesState.entities.length,
    entities: entitiesState.entities.map(e => ({ id: e.id, entityId: e.entityId, state: e.state })),
    timestamp: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lat, lon } = useGeolocation();

  // Activate WebSocket subscription for real-time entity updates
  const { isConnected } = useEntitySubscriptions();

  // Use ref to track if initial fetch has been attempted (prevents re-fetching)
  const initialFetchAttempted = useRef(false);

  // Debug logging for Redux updates
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[OverviewPanel] Entities updated from Redux:", {
        count: entities.length,
        entities: entities.map(e => ({ id: e.id, entityId: e.entityId, state: e.state })),
        isConnected,
        initialFetchAttempted: initialFetchAttempted.current,
      });
    }
  }, [entities, isConnected]);

  // Fetch entities from API ONLY once on initial mount
  // This ensures REST data is initialization-only and never overwrites WebSocket updates
  useEffect(() => {
    // Only fetch once - never re-fetch after initial load
    if (initialFetchAttempted.current) {
      setLoading(false);
      return;
    }

    initialFetchAttempted.current = true;

    async function fetchEntities() {
      try {
        setLoading(true);
        const data = await apiClient.get<Entity[]>("/entities");

        // Only set entities if Redux is empty (WebSocket might have already populated it)
        // This prevents overwriting live WebSocket updates
        if (entities.length === 0) {
          dispatch(setEntities(data || []));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entities");
      } finally {
        setLoading(false);
      }
    }

    fetchEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount


  if (loading) {
    return (
      <Box>
        <PanelHeader
          title="Overview"
          description="Real-time system control and status overview"
        />
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <PanelHeader
          title="Overview"
          description="Real-time system control and status overview"
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  // Filter entities to show only useful/controllable ones
  const filteredEntities = entities.filter((entity) => {
    // Include these domains (controllable devices and useful sensors)
    const includedDomains = [
      'light',
      'switch',
      'climate',
      'cover',
      'lock',
      'fan',
      'media_player',
      'sensor',           // Include sensors (temperature, humidity, power, etc.)
      'binary_sensor'     // Include binary sensors (motion, door/window, etc.)
    ];

    return includedDomains.includes(entity.domain);
  });

  return (
    <Box>
      <PanelHeader
        title="Overview"
        description="Real-time system control and status overview"
      />

      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6} md={4}>
          <WeatherCard lat={lat || undefined} lon={lon || undefined} />
        </Grid>
        {filteredEntities.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              No controllable entities found. Add lights, switches, or other devices.
            </Alert>
          </Grid>
        ) : (
          filteredEntities.map((entity) => (
            <Grid item xs={12} sm={6} md={4} key={entity.entityId}>
              <EntityCard entityId={entity.entityId} />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}

