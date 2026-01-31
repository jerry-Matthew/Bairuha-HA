"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Box, Alert, CircularProgress } from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import { HacsList } from "./HacsList.client";
import type { HacsExtension } from "../server/hacs.types";

interface HacsCatalogResponse {
  extensions: HacsExtension[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function HacsPanel() {
  const [extensions, setExtensions] = useState<HacsExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [installedOnHA, setInstalledOnHA] = useState<string[]>([]);

  // Fetch installed integrations from Real HA
  useEffect(() => {
    const fetchInstalledIntegrations = async () => {
      try {
        const response = await fetch('/api/hacs/installed-on-ha');
        if (response.ok) {
          const data = await response.json();
          setInstalledOnHA(data.components || []);
        }
      } catch (error) {
        console.error('Failed to fetch installed integrations:', error);
      }
    };

    fetchInstalledIntegrations();
    // Poll every 30 seconds
    const interval = setInterval(fetchInstalledIntegrations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch extensions
  useEffect(() => {
    let cancelled = false;

    const fetchExtensions = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: debouncedSearchQuery,
          page: page.toString(),
          per_page: perPage.toString(),
        });

        const response = await fetch(`/api/hacs/catalog?${params.toString()}`);

        if (cancelled) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 429) {
            setError("GitHub API rate limit exceeded. Please wait a moment and try again.");
          } else {
            setError(errorData.message || "Failed to fetch extensions");
          }
          setExtensions([]);
          setTotal(0);
          return;
        }

        const data: HacsCatalogResponse = await response.json();
        if (cancelled) return;

        setExtensions(data.extensions || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / perPage));
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error fetching extensions:", err);
        setError(err.message || "Failed to fetch extensions");
        setExtensions([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchExtensions();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchQuery, page, perPage]);

  // Handle extension update (after install/update/refresh)
  const handleExtensionUpdate = useCallback((updatedExtension: HacsExtension) => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.id === updatedExtension.id ? updatedExtension : ext))
    );
  }, []);

  return (
    <Box>
      <PanelHeader
        title="Home Assistant Community Store"
        description="Discover and manage community extensions"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && extensions.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <HacsList
          extensions={extensions}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={perPage}
          onPageChange={setPage}
          onExtensionUpdate={handleExtensionUpdate}
          installedOnHA={installedOnHA}
        />
      )}
    </Box>
  );
}

