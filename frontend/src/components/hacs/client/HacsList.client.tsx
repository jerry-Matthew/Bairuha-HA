"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Divider,
  Pagination,
  Tooltip,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListIcon from "@mui/icons-material/FilterList";
import SettingsIcon from "@mui/icons-material/Settings";
import { HacsRow } from "./HacsRow.client";
import { groupByStatus, sortExtensions } from "../utils/hacsSort";
import type { HacsExtension } from "../server/hacs.types";
import type { SortField } from "../server/hacs.types";

interface HacsListProps {
  extensions: HacsExtension[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onExtensionUpdate: (extension: HacsExtension) => void;
  installedOnHA: string[];
}

export function HacsList({
  extensions,
  loading,
  searchQuery,
  onSearchChange,
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onExtensionUpdate,
  installedOnHA,
}: HacsListProps) {
  const [sortBy, setSortBy] = useState<SortField>("activity");
  const [groupBy, setGroupBy] = useState<"status" | "type" | "none">("status");

  // Sort extensions
  const sortedExtensions = useMemo(() => {
    return sortExtensions(extensions, sortBy);
  }, [extensions, sortBy]);

  // Group by status
  const { downloaded, new: newExtensions } = useMemo(() => {
    return groupByStatus(sortedExtensions);
  }, [sortedExtensions]);

  return (
    <Box>
      {/* Search and Filter Bar */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Tooltip title="Filters">
          <IconButton
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <FilterListIcon />
          </IconButton>
        </Tooltip>

        <TextField
          placeholder="Search extensions..."
          size="small"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => onSearchChange("")}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Group by</InputLabel>
          <Select
            value={groupBy}
            label="Group by"
            onChange={(e) => setGroupBy(e.target.value as "status" | "type" | "none")}
          >
            <MenuItem value="status">Status</MenuItem>
            <MenuItem value="type">Type</MenuItem>
            <MenuItem value="none">None</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={(e) => setSortBy(e.target.value as SortField)}
          >
            <MenuItem value="activity">Activity</MenuItem>
            <MenuItem value="stars">Stars</MenuItem>
            <MenuItem value="downloads">Downloads</MenuItem>
            <MenuItem value="name">Name</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title="Settings">
          <IconButton
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Extension List */}
      <TableContainer component={Box}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Extension</TableCell>
                <TableCell>Downloads</TableCell>
                <TableCell>Stars</TableCell>
                <TableCell>Activity</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupBy === "status" && downloaded.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ backgroundColor: "action.hover", py: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Downloaded ({downloaded.length})
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {downloaded.map((ext) => (
                    <HacsRow
                      key={ext.id}
                      extension={ext}
                      onUpdate={onExtensionUpdate}
                      installedOnHA={installedOnHA}
                    />
                  ))}
                </>
              )}

              {groupBy === "status" && downloaded.length > 0 && newExtensions.length > 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 0 }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}

              {groupBy === "status" && newExtensions.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ backgroundColor: "action.hover", py: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        New ({newExtensions.length})
                        {total > newExtensions.length && totalPages > 1 && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, fontWeight: 400 }}>
                            (page {page} of {totalPages})
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {newExtensions.map((ext) => (
                    <HacsRow
                      key={ext.id}
                      extension={ext}
                      onUpdate={onExtensionUpdate}
                      installedOnHA={installedOnHA}
                    />
                  ))}
                </>
              )}

              {groupBy !== "status" &&
                sortedExtensions.map((ext) => (
                  <HacsRow
                    key={ext.id}
                    extension={ext}
                    onUpdate={onExtensionUpdate}
                    installedOnHA={installedOnHA}
                  />
                ))}

              {!loading && sortedExtensions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No extensions found matching your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 3,
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {((page - 1) * perPage) + 1} - {Math.min(page * perPage, total)} of {total} extensions
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => {
              onPageChange(value);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}

