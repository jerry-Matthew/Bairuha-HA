"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useStateInspection } from "../hooks/useStateInspection";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";
import { useAppSelector } from "@/store/hooks";
import type { Entity } from "@/types";

// Extended Entity type that includes source field
type EntityWithSource = Entity & {
  source?: "ha" | "internal" | "hybrid";
};
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";

const STATE_COLORS: Record<string, string> = {
  on: "#4caf50",
  off: "#f44336",
  unavailable: "#9e9e9e",
  unknown: "#ff9800",
};

function getStateColor(state: string): string {
  const lowerState = state.toLowerCase();
  if (STATE_COLORS[lowerState]) {
    return STATE_COLORS[lowerState];
  }
  // Check if state contains "on" or "off"
  if (lowerState.includes("on")) return STATE_COLORS.on;
  if (lowerState.includes("off")) return STATE_COLORS.off;
  return STATE_COLORS.unknown;
}

function getSourceBadgeColor(source: string): "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning" {
  switch (source) {
    case "ha":
      return "primary";
    case "internal":
      return "secondary";
    case "hybrid":
      return "success";
    default:
      return "default";
  }
}

export function StateInspectionTab() {
  const [domain, setDomain] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [state, setState] = useState("");
  const [source, setSource] = useState<"ha" | "internal" | "hybrid" | "">("");
  const [selectedEntity, setSelectedEntity] = useState<EntityWithSource | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { entities, total, loading, error, fetchEntities, fetchEntityDetail } = useStateInspection();
  
  // Subscribe to real-time entity updates
  const { isConnected } = useEntitySubscriptions();
  const realtimeEntities = useAppSelector((state) => state.entities.entities);

  // Merge real-time updates with fetched entities
  const mergedEntities = entities.map((entity) => {
    const realtimeEntity = realtimeEntities.find((e) => e.entityId === entity.entityId);
    return realtimeEntity || entity;
  });

  // Fetch entities when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEntities({
        domain: domain || undefined,
        deviceId: deviceId || undefined,
        state: state || undefined,
        source: source || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [domain, deviceId, state, source, page, rowsPerPage]);

  const handleViewDetail = async (entity: EntityWithSource) => {
    const detail = await fetchEntityDetail(entity.entityId);
    if (detail) {
      setSelectedEntity(detail);
      setDetailDialogOpen(true);
    }
  };

  const handleCopyJson = (entity: EntityWithSource) => {
    navigator.clipboard.writeText(JSON.stringify(entity, null, 2));
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        State Inspection
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Browse and filter entities. Updates in real-time via WebSocket.
        {isConnected && <Chip label="WebSocket Connected" color="success" size="small" sx={{ ml: 1 }} />}
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          label="Domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. light, switch, sensor"
          size="small"
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="Device ID"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="Filter by device"
          size="small"
          sx={{ minWidth: 200 }}
        />
        <TextField
          label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="e.g. on, off, unavailable"
          size="small"
          sx={{ minWidth: 150 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Source</InputLabel>
          <Select value={source} label="Source" onChange={(e) => setSource(e.target.value as any)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ha">Home Assistant</MenuItem>
            <MenuItem value="internal">Internal</MenuItem>
            <MenuItem value="hybrid">Hybrid</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          onClick={() => {
            setDomain("");
            setDeviceId("");
            setState("");
            setSource("");
            setPage(0);
          }}
        >
          Clear Filters
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && entities.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : mergedEntities.length === 0 ? (
        <Alert severity="info">No entities found matching the filters.</Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Entity ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Domain</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mergedEntities.map((entity) => (
                  <TableRow key={entity.entityId} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
                        {entity.entityId}
                      </Typography>
                    </TableCell>
                    <TableCell>{entity.name || entity.entityId}</TableCell>
                    <TableCell>
                      <Chip label={entity.domain} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entity.state}
                        size="small"
                        sx={{
                          backgroundColor: getStateColor(entity.state),
                          color: "white",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {entity.source && (
                        <Chip
                          label={entity.source.toUpperCase()}
                          size="small"
                          color={getSourceBadgeColor(entity.source)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {entity.lastUpdated
                        ? new Date(entity.lastUpdated).toLocaleString()
                        : "N/A"}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Detail">
                        <IconButton size="small" onClick={() => handleViewDetail(entity)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copy JSON">
                        <IconButton size="small" onClick={() => handleCopyJson(entity)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}

      {/* Entity Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Entity Detail
          <IconButton
            aria-label="close"
            onClick={() => setDetailDialogOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedEntity && (
            <Box>
              <TextField
                fullWidth
                multiline
                value={JSON.stringify(selectedEntity, null, 2)}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                }}
                variant="outlined"
                minRows={15}
              />
              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedEntity, null, 2));
                  }}
                >
                  Copy JSON
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
