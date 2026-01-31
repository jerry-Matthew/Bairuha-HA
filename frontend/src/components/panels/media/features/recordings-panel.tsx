"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import AudioFileOutlinedIcon from "@mui/icons-material/AudioFileOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { useAuth } from "@/contexts/auth-context";

interface Recording {
  id: string;
  name: string;
  type: string;
  size: number;
  recordedAt: string;
  url: string;
  source?: string;
}

export function RecordingsPanel() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/media/recordings", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load recordings");
      }

      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (err: any) {
      setError(err.message || "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  };

  const getRecordingIcon = (type: string) => {
    if (type.startsWith("audio/")) return <AudioFileOutlinedIcon color="primary" />;
    if (type.startsWith("video/")) return <VideoLibraryOutlinedIcon color="primary" />;
    return <VideoLibraryOutlinedIcon color="primary" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePlay = (recording: Recording) => {
    window.open(recording.url, "_blank");
  };

  const handleDownload = (recording: Recording) => {
    window.open(recording.url, "_blank");
  };

  if (loading) {
    return (
      <Box>
        <PanelHeader title="Recordings" description="View recorded media files" />
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <PanelHeader title="Recordings" description="View recorded media files" />

      <Card
        sx={{
          mt: 3,
          backgroundColor: "background.paper",
          borderRadius: 2,
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 2px 8px rgba(0, 0, 0, 0.3)"
              : "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {recordings.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 8,
              }}
            >
              <VideoLibraryOutlinedIcon
                sx={{
                  fontSize: 64,
                  color: "text.secondary",
                  mb: 2,
                }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No recordings found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recorded media will appear here when available
              </Typography>
            </Box>
          ) : (
            <List>
              {recordings.map((recording) => (
                <ListItem
                  key={recording.id}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>{getRecordingIcon(recording.type)}</ListItemIcon>
                  <ListItemText
                    primary={recording.name}
                    secondary={
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(recording.size)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(recording.recordedAt).toLocaleString()}
                        </Typography>
                        {recording.source && (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              •
                            </Typography>
                            <Chip
                              label={recording.source}
                              size="small"
                              sx={{ height: 20 }}
                            />
                          </>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handlePlay(recording)}
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      <PlayArrowOutlinedIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDownload(recording)}
                      color="primary"
                    >
                      <DownloadOutlinedIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

