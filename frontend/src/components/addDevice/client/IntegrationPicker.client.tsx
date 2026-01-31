"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import CloudIcon from "@mui/icons-material/Cloud";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LanguageIcon from "@mui/icons-material/Language";
import IconButton from "@mui/material/IconButton";
import type { Integration } from "../server/device.types";
import { MDIIcon } from "@/components/ui/mdi-icon";

interface IntegrationPickerProps {
  integrations: Integration[];
  onSelect: (integration: Integration) => void;
  loading?: boolean;
}

interface SelectBrandIntegration {
  domain: string;
  name: string;
  icon?: string;
  brandImageUrl?: string;
  isCloud: boolean;
  isConfigured: boolean;
}

export function IntegrationPicker({
  integrations,
  onSelect,
  loading = false,
}: IntegrationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [serverIntegrations, setServerIntegrations] = useState<Integration[]>([]);
  const [selectedLegacyIntegration, setSelectedLegacyIntegration] = useState<Integration | null>(null);
  const [selectedVirtualIntegration, setSelectedVirtualIntegration] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchIntegrations = async (query: string, offset: number, reset: boolean) => {
    try {
      if (reset) setIsLoading(true);

      const response = await fetch(`/api/integrations?q=${encodeURIComponent(query)}&limit=50&offset=${offset}`);
      if (!response.ok) throw new Error("Failed to fetch integrations");

      const data = await response.json();
      const newIntegrations = data.integrations || [];

      setServerIntegrations(prev => reset ? newIntegrations : [...prev, ...newIntegrations]);
      setHasMore(newIntegrations.length === 50); // Valid assumption if limit is 50
    } catch (err) {
      console.error(err);
    } finally {
      if (reset) setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchIntegrations("", 0, true);
  }, []);

  // Type guard to check if integration has select-brand format
  const hasSelectBrandFormat = (integration: Integration): integration is Integration & SelectBrandIntegration => {
    return 'isCloud' in integration && 'isConfigured' in integration;
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIntegrations(searchQuery, 0, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchIntegrations(searchQuery, serverIntegrations.length, false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading, searchQuery, serverIntegrations.length]);

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Select brand
      </Typography>

      {/* Search Input */}
      <TextField
        fullWidth
        placeholder="Search for a brand name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {searchQuery && (
                <IconButton
                  edge="end"
                  onClick={handleClearSearch}
                  size="small"
                  aria-label="clear search"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
      />

      {/* Results count */}
      {searchQuery && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {serverIntegrations.length === 0 && !isLoading
            ? "No brands found"
            : `Found ${serverIntegrations.length}+ brand${serverIntegrations.length !== 1 ? "s" : ""}`}
        </Typography>
      )}

      {/* No results message */}
      {serverIntegrations.length === 0 && !isLoading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 4,
            textAlign: "center",
          }}
        >
          <SearchIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No brands found matching "{searchQuery}"
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search term
          </Typography>
        </Box>
      ) : (
        <List>


          {serverIntegrations.map((integration) => {
            const isConfigured = hasSelectBrandFormat(integration) ? integration.isConfigured : false;
            const isCloud = hasSelectBrandFormat(integration) ? integration.isCloud : false;

            return (
              <ListItem key={integration.id || integration.domain} disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (integration.supportsDeviceCreation) {
                      onSelect(integration);
                    } else if (integration.metadata?.integration_type === "virtual" && integration.metadata?.supported_by) {
                      setSelectedVirtualIntegration(integration);
                    } else {
                      setSelectedLegacyIntegration(integration);
                    }
                  }}
                >
                  <ListItemIcon>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, position: "relative" }}>
                      {hasSelectBrandFormat(integration) && integration.brandImageUrl ? (
                        <>
                          <Box
                            component="img"
                            src={integration.brandImageUrl}
                            alt={integration.name}
                            loading="lazy"
                            sx={{
                              width: 24,
                              height: 24,
                              objectFit: "contain",
                              position: "absolute",
                              display: "block",
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const currentSrc = target.src;

                              // If looking for icon.png failed, try logo.png
                              if (currentSrc.includes('/icon.png')) {
                                target.src = currentSrc.replace('/icon.png', '/logo.png');
                              }
                              // If logo.png also failed (or it wasn't icon.png), hide image and show fallback
                              else {
                                target.style.display = "none";
                                const fallback = target.parentElement?.querySelector('[data-fallback-icon]') as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }
                            }}
                          />
                          <Box
                            data-fallback-icon
                            sx={{
                              display: "none",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {integration.icon ? (
                              <MDIIcon icon={integration.icon} size={24} />
                            ) : (
                              <DevicesIcon sx={{ fontSize: 24 }} />
                            )}
                          </Box>
                        </>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {integration.icon ? (
                            <MDIIcon icon={integration.icon} size={24} />
                          ) : (
                            <DevicesIcon sx={{ fontSize: 24 }} />
                          )}
                        </Box>
                      )}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={integration.name}
                    secondary={integration.description}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {isCloud && (
                      <LanguageIcon
                        sx={{
                          fontSize: "18px",
                          color: "text.secondary",
                        }}
                        titleAccess="Cloud integration"
                      />
                    )}
                    {isConfigured && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Configured"
                        size="small"
                        color="success"
                      />
                    )}
                    <ChevronRightIcon sx={{ color: "text.secondary", ml: 0.5 }} />
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
          {/* Loading sentry for infinite scroll */}
          {hasMore && (
            <Box ref={observerTarget} sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </List>
      )}
      {/* Legacy Integration Dialog */}
      <Dialog
        open={!!selectedLegacyIntegration}
        onClose={() => setSelectedLegacyIntegration(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>This integration cannot be added from the UI</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            You can add this integration by adding it to your 'configuration.yaml'. See the documentation for more information.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLegacyIntegration(null)}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedLegacyIntegration?.documentation_url) {
                window.open(selectedLegacyIntegration.documentation_url, "_blank");
              } else {
                window.open(`https://www.home-assistant.io/integrations/${selectedLegacyIntegration?.domain}`, "_blank");
              }
              setSelectedLegacyIntegration(null);
            }}
            autoFocus
          >
            Open documentation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Virtual Integration Redirect Dialog */}
      <Dialog
        open={!!selectedVirtualIntegration}
        onClose={() => setSelectedVirtualIntegration(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Redirect to supported integration?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Support for <b>{selectedVirtualIntegration?.name}</b> devices is provided by <b>{selectedVirtualIntegration?.metadata?.supported_by}</b>.
            <br /><br />
            Do you want to continue with setup for <b>{selectedVirtualIntegration?.metadata?.supported_by}</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedVirtualIntegration(null)}>No</Button>
          <Button
            onClick={() => {
              if (selectedVirtualIntegration?.metadata?.supported_by) {
                // Construct a minimal integration object for the redirect target
                // The parent component mainly uses the ID/domain to advance the flow
                const targetDomain = selectedVirtualIntegration.metadata.supported_by;
                const targetIntegration: Integration = {
                  id: targetDomain, // Assuming domain is used as ID
                  domain: targetDomain,
                  name: targetDomain, // Will likely be fetched properly by backend later
                  supportsDeviceCreation: true,
                  isCloud: false,
                  isConfigured: false
                };
                onSelect(targetIntegration);
              }
              setSelectedVirtualIntegration(null);
            }}
            autoFocus
            variant="contained"
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function NoDevicesState() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        textAlign: "center",
      }}
    >
      <DevicesIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Integrations Available
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Install and enable an integration to add devices
      </Typography>
    </Box>
  );
}

