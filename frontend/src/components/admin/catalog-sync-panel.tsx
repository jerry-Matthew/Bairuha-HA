'use client';

/**
 * Catalog Sync Panel
 * 
 * Admin panel for viewing catalog sync status and triggering manual syncs.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Refresh, History, Rollback } from '@mui/icons-material';

interface SyncStatus {
  current: {
    syncId: string;
    startedAt: string;
    status: string;
    type: string;
  } | null;
  lastSync: {
    syncId: string;
    startedAt: string;
    completedAt: string | null;
    status: string;
    type: string;
    total: number;
    new: number;
    updated: number;
    deleted: number;
    errors: number;
  } | null;
  syncInProgress: boolean;
}

interface SyncHistory {
  id: string;
  type: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  total: number;
  new: number;
  updated: number;
  deleted: number;
  errors: number;
}

export default function CatalogSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rollbackDialog, setRollbackDialog] = useState<{ open: boolean; syncId: string | null }>({
    open: false,
    syncId: null,
  });
  const [syncType, setSyncType] = useState<'full' | 'incremental'>('incremental');

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/integrations/sync');
      if (!response.ok) throw new Error('Failed to fetch sync status');
      const data = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/integrations/sync/history?limit=10');
      if (!response.ok) throw new Error('Failed to fetch sync history');
      const data = await response.json();
      setHistory(data.syncs || []);
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHistory();

    // Poll for status updates every 5 seconds if sync is in progress
    const interval = setInterval(() => {
      if (status?.syncInProgress) {
        fetchStatus();
        fetchHistory();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status?.syncInProgress]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: syncType }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start sync');
      }

      const data = await response.json();
      alert(`Sync started successfully! Sync ID: ${data.syncId}`);

      // Refresh status
      await fetchStatus();
      await fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackDialog.syncId) return;

    try {
      const response = await fetch(`/api/integrations/sync/${rollbackDialog.syncId}/rollback`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rollback');
      }

      alert('Sync rolled back successfully');
      setRollbackDialog({ open: false, syncId: null });
      await fetchStatus();
      await fetchHistory();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Catalog Sync Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Sync Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Sync Status</Typography>
            <Button
              startIcon={<Refresh />}
              onClick={() => {
                fetchStatus();
                fetchHistory();
              }}
              disabled={syncing}
            >
              Refresh
            </Button>
          </Box>

          {status?.current && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Current Sync:
              </Typography>
              <Chip
                label={status.current.status}
                color={getStatusColor(status.current.status) as any}
                sx={{ mt: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Started: {new Date(status.current.startedAt).toLocaleString()}
              </Typography>
            </Box>
          )}

          {status?.lastSync && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Last Sync:
              </Typography>
              <Chip
                label={status.lastSync.status}
                color={getStatusColor(status.lastSync.status) as any}
                sx={{ mt: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Started: {new Date(status.lastSync.startedAt).toLocaleString()}
                {status.lastSync.completedAt && (
                  <> • Completed: {new Date(status.lastSync.completedAt).toLocaleString()}</>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Total: {status.lastSync.total} • New: {status.lastSync.new} • Updated: {status.lastSync.updated} • Deleted: {status.lastSync.deleted}
                {status.lastSync.errors > 0 && <> • Errors: {status.lastSync.errors}</>}
              </Typography>
            </Box>
          )}

          {!status?.current && !status?.lastSync && (
            <Typography variant="body2" color="text.secondary">
              No sync history available
            </Typography>
          )}

          {/* Manual Sync Controls */}
          <Box mt={3} display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sync Type</InputLabel>
              <Select
                value={syncType}
                label="Sync Type"
                onChange={(e) => setSyncType(e.target.value as 'full' | 'incremental')}
              >
                <MenuItem value="incremental">Incremental</MenuItem>
                <MenuItem value="full">Full</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleSync}
              disabled={syncing || status?.syncInProgress}
              startIcon={syncing ? <CircularProgress size={16} /> : <Refresh />}
            >
              {syncing ? 'Starting...' : 'Start Sync'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Sync History Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Sync History</Typography>
            <Button startIcon={<History />} onClick={fetchHistory}>
              Refresh
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Completed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Results</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No sync history available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((sync) => (
                    <TableRow key={sync.id}>
                      <TableCell>{sync.type}</TableCell>
                      <TableCell>{new Date(sync.startedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {sync.completedAt ? new Date(sync.completedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sync.status}
                          color={getStatusColor(sync.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          Total: {sync.total} • New: {sync.new} • Updated: {sync.updated} • Deleted: {sync.deleted}
                          {sync.errors > 0 && <span style={{ color: 'red' }}> • Errors: {sync.errors}</span>}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {sync.status === 'failed' && (
                          <Button
                            size="small"
                            startIcon={<Rollback />}
                            onClick={() => setRollbackDialog({ open: true, syncId: sync.id })}
                          >
                            Rollback
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Rollback Dialog */}
      <Dialog open={rollbackDialog.open} onClose={() => setRollbackDialog({ open: false, syncId: null })}>
        <DialogTitle>Rollback Sync</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to rollback sync {rollbackDialog.syncId}? This will restore the catalog to its state before this sync.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialog({ open: false, syncId: null })}>Cancel</Button>
          <Button onClick={handleRollback} color="error" variant="contained">
            Rollback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
