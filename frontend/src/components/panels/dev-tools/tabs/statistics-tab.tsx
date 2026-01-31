"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  TablePagination,
} from "@mui/material";
import { useStatistics } from "../hooks/useStatistics";
import RefreshIcon from "@mui/icons-material/Refresh";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export function StatisticsTab() {
  const [statisticsType, setStatisticsType] = useState(0);
  const [timeRange, setTimeRange] = useState("24h");
  const [domain, setDomain] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const {
    loading,
    error,
    entityStatistics,
    domainStatistics,
    deviceStatistics,
    summaryStatistics,
    total,
    timeRange: statsTimeRange,
    fetchEntityStatistics,
    fetchDomainStatistics,
    fetchDeviceStatistics,
    fetchSummaryStatistics,
  } = useStatistics();

  useEffect(() => {
    if (statisticsType === 0) {
      fetchEntityStatistics({ domain, deviceId, entityId, timeRange, limit: rowsPerPage, offset: page * rowsPerPage });
    } else if (statisticsType === 1) {
      fetchDomainStatistics(timeRange);
    } else if (statisticsType === 2) {
      fetchDeviceStatistics(timeRange);
    }
    fetchSummaryStatistics(timeRange);
  }, [statisticsType, timeRange, domain, deviceId, entityId, page, rowsPerPage]);

  const handleRefresh = () => {
    if (statisticsType === 0) {
      fetchEntityStatistics({ domain, deviceId, entityId, timeRange, limit: rowsPerPage, offset: page * rowsPerPage });
    } else if (statisticsType === 1) {
      fetchDomainStatistics(timeRange);
    } else if (statisticsType === 2) {
      fetchDeviceStatistics(timeRange);
    }
    fetchSummaryStatistics(timeRange);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Statistics</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {summaryStatistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Total Entities
                </Typography>
                <Typography variant="h5">{summaryStatistics.totalEntities}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Total State Changes
                </Typography>
                <Typography variant="h5">{summaryStatistics.totalStateChanges.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Most Active Entity
                </Typography>
                <Typography variant="body1" noWrap>
                  {summaryStatistics.mostActiveEntity}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Most Active Domain
                </Typography>
                <Typography variant="body1">{summaryStatistics.mostActiveDomain}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} label="Time Range">
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>

          {statisticsType === 0 && (
            <>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Domain</InputLabel>
                <Select value={domain} onChange={(e) => { setDomain(e.target.value); setPage(0); }} label="Domain">
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="switch">Switch</MenuItem>
                  <MenuItem value="sensor">Sensor</MenuItem>
                  <MenuItem value="climate">Climate</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs value={statisticsType} onChange={(_, v) => { setStatisticsType(v); setPage(0); }}>
            <Tab label="Entity Statistics" />
            <Tab label="Domain Statistics" />
            <Tab label="Device Statistics" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        <TabPanel value={statisticsType} index={0}>
          {!loading && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Entity ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell align="right">State Changes</TableCell>
                      <TableCell>Current State</TableCell>
                      <TableCell align="right">Uptime %</TableCell>
                      <TableCell>Most Common State</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entityStatistics.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary">No statistics available</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      entityStatistics.map((stat) => (
                        <TableRow key={stat.entityId}>
                          <TableCell>{stat.entityId}</TableCell>
                          <TableCell>{stat.entityName}</TableCell>
                          <TableCell>
                            <Chip label={stat.domain} size="small" />
                          </TableCell>
                          <TableCell align="right">{stat.stateChangeCount}</TableCell>
                          <TableCell>
                            <Chip
                              label={stat.currentState}
                              size="small"
                              color={stat.currentState === "on" ? "success" : "default"}
                            />
                          </TableCell>
                          <TableCell align="right">{stat.uptimePercentage.toFixed(1)}%</TableCell>
                          <TableCell>{stat.mostCommonState}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </TabPanel>

        <TabPanel value={statisticsType} index={1}>
          {!loading && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Domain</TableCell>
                    <TableCell align="right">Entity Count</TableCell>
                    <TableCell align="right">Total State Changes</TableCell>
                    <TableCell align="right">Avg State Changes</TableCell>
                    <TableCell>Most Active Entity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {domainStatistics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">No statistics available</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    domainStatistics.map((stat) => (
                      <TableRow key={stat.domain}>
                        <TableCell>
                          <Chip label={stat.domain} size="small" />
                        </TableCell>
                        <TableCell align="right">{stat.entityCount}</TableCell>
                        <TableCell align="right">{stat.totalStateChanges.toLocaleString()}</TableCell>
                        <TableCell align="right">{stat.averageStateChanges.toFixed(1)}</TableCell>
                        <TableCell>{stat.mostActiveEntity}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={statisticsType} index={2}>
          {!loading && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Device ID</TableCell>
                    <TableCell>Device Name</TableCell>
                    <TableCell align="right">Entity Count</TableCell>
                    <TableCell align="right">Total State Changes</TableCell>
                    <TableCell align="right">Avg State Changes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deviceStatistics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">No statistics available</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    deviceStatistics.map((stat) => (
                      <TableRow key={stat.deviceId}>
                        <TableCell>{stat.deviceId.substring(0, 8)}...</TableCell>
                        <TableCell>{stat.deviceName}</TableCell>
                        <TableCell align="right">{stat.entityCount}</TableCell>
                        <TableCell align="right">{stat.totalStateChanges.toLocaleString()}</TableCell>
                        <TableCell align="right">{stat.averageStateChanges.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}
