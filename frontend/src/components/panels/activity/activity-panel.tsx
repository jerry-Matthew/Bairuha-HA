"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { PanelHeader } from "@/components/ui/panel-header";

// Types matching backend
export interface ActivityEvent {
  id: string;
  entity_id: string;
  entity_name: string;
  action: string;
  area: string;
  type: string;
  timestamp: string;
}

const ACTIVITY_FILTER_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "state_change", label: "State Changes" },
  { value: "trigger", label: "Triggers" },
  { value: "action", label: "Actions" },
];

export function ActivityPanel() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("limit", "50"); // Fetch 50 most recent

      if (filter !== "all") {
        params.append("filter", filter);
      }

      const response = await fetch(`/api/activity?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch activity logs");
      }
      const data = await response.json();
      console.log("Activity Data Received:", data); // DEBUG LOG
      setEvents(data.data);
    } catch (err: any) {
      console.error("Error fetching activities:", err);
      setError(err.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchActivities();

    // Set up polling for real-time updates (simplified)
    const interval = setInterval(fetchActivities, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Client-side filtering for search query (since API search might be complex to implement efficiently on all fields)
  // For a large dataset, this should be moved to backend
  const filteredEvents = events.filter((event) => {
    if (!debouncedSearch) return true;
    const query = debouncedSearch.toLowerCase();
    return (
      event.entity_name.toLowerCase().includes(query) ||
      event.entity_id.toLowerCase().includes(query) ||
      event.action.toLowerCase().includes(query) ||
      event.area?.toLowerCase().includes(query)
    );
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box>
      <PanelHeader
        title="Activity"
        description="System-wide event log"
      />

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          placeholder="Search events..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={filter}
            label="Filter"
            onChange={(e) => setFilter(e.target.value)}
          >
            {ACTIVITY_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {loading && events.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {filteredEvents.length === 0 ? (
              <Typography color="text.secondary" align="center" py={4}>
                No activity found
              </Typography>
            ) : (
              filteredEvents.map((event, index) => (
                <Box key={event.id}>
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            event.type === "state_change"
                              ? "primary.main"
                              : event.type === "trigger"
                                ? "secondary.main"
                                : "success.main",
                        }}
                      >
                        <FiberManualRecordIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      {index < filteredEvents.length - 1 && (
                        <Box
                          sx={{
                            width: 2,
                            flexGrow: 1,
                            bgcolor: "divider",
                            my: 0.5,
                            minHeight: 40,
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ flexGrow: 1, pb: index < filteredEvents.length - 1 ? 2 : 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(event.timestamp)}
                        </Typography>
                        <Chip
                          label={event.type}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        {event.entity_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.action} • {event.area}
                      </Typography>
                    </Box>
                  </Box>
                  {index < filteredEvents.length - 1 && <Divider sx={{ ml: 5 }} />}
                </Box>
              ))
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
