/**
 * OAuth Step Component
 * 
 * UI component for OAuth authorization step in device setup flow
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";

interface OAuthStepProps {
  flowId: string;
  integrationDomain: string;
  providerId: string;
  scopes: string[];
  onComplete: () => void;
  onCancel: () => void;
}

export function OAuthStep({
  flowId,
  integrationDomain,
  providerId,
  scopes,
  onComplete,
  onCancel,
}: OAuthStepProps) {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);

  // Check for OAuth callback result
  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    const oauthError = searchParams.get("oauth_error");
    const errorDescription = searchParams.get("error_description");

    if (oauthSuccess === "true") {
      onComplete();
      return;
    }

    if (oauthError) {
      setError(errorDescription || oauthError);
      setLoading(false);
    }
  }, [searchParams, onComplete]);

  // Generate authorization URL on mount
  useEffect(() => {
    async function fetchAuthorizationUrl() {
      try {
        setLoading(true);
        const response = await fetch("/api/oauth/authorize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ flowId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to generate authorization URL");
        }

        const data = await response.json();
        setAuthorizationUrl(data.authorizationUrl);
      } catch (err: any) {
        setError(err.message || "Failed to initialize OAuth");
      } finally {
        setLoading(false);
      }
    }

    fetchAuthorizationUrl();
  }, [flowId]);

  const handleAuthorize = () => {
    if (authorizationUrl) {
      // Redirect to OAuth provider
      window.location.href = authorizationUrl;
    }
  };

  const providerNames: Record<string, string> = {
    google: "Google",
    spotify: "Spotify",
    nest: "Nest",
  };

  const providerName = providerNames[providerId] || providerId;

  if (loading && !authorizationUrl) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Preparing authorization...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <LockIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6">
              Authorize {providerName}
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Please authorize the application to access your {providerName} account to complete the setup.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {scopes.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                This application will have access to:
              </Typography>
              <List dense>
                {scopes.map((scope) => (
                  <ListItem key={scope}>
                    <ListItemText primary={scope} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleAuthorize}
              disabled={!authorizationUrl || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
              fullWidth
            >
              {loading ? "Preparing..." : (providerName ? `Authorize with ${providerName}` : "Authorize Access")}
            </Button>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            You will be redirected {providerName ? `to ${providerName} ` : ""}to complete authorization.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
