"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import StopOutlinedIcon from "@mui/icons-material/StopOutlined";
import RadioOutlinedIcon from "@mui/icons-material/RadioOutlined";
import { useAuth } from "@/contexts/auth-context";

interface RadioStation {
  id: string;
  name: string;
  url: string;
  country: string;
  tags?: string;
}

const STORAGE_KEY = "radio_playing_station";
const STORAGE_STREAM_URL_KEY = "radio_stream_url";

export function RadioBrowserPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingStation, setPlayingStation] = useState<RadioStation | null>(null);
  const [mounted, setMounted] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const { accessToken } = useAuth();

  // CRITICAL: Only mark as mounted after hydration completes
  // This ensures server and client render identical HTML on first paint
  useEffect(() => {
    setMounted(true);
  }, []);

  // Restore playback ONLY after component is mounted (after hydration)
  // This prevents any localStorage reads from affecting the initial render
  useEffect(() => {
    if (!mounted) return; // Don't run until after hydration

    const restorePlayback = () => {
      try {
        const savedStation = localStorage.getItem(STORAGE_KEY);
        const savedStreamUrl = localStorage.getItem(STORAGE_STREAM_URL_KEY);

        if (savedStation && savedStreamUrl) {
          const station: RadioStation = JSON.parse(savedStation);
          
          // Create audio element with proper settings
          const audio = new Audio(savedStreamUrl);
          audio.preload = "auto";
          audio.crossOrigin = "anonymous";
          
          // Set up event handlers before playing
          audio.onended = () => {
            setPlayingStation(null);
            audioElementRef.current = null;
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_STREAM_URL_KEY);
          };

          audio.onerror = (e) => {
            console.error("Audio error:", e);
            setError("Failed to play stream");
            setPlayingStation(null);
            audioElementRef.current = null;
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_STREAM_URL_KEY);
          };

          // Store reference and station state first
          audioElementRef.current = audio;
          setPlayingStation(station);

          // Try to play - if it fails, the audio will still be ready
          audio.play().catch((err) => {
            console.warn("Autoplay prevented, but audio is ready:", err);
            // Don't clear storage - user can click play to resume
            // The audio element is ready and will play on user interaction
          });
        }
      } catch (err) {
        console.error("Failed to restore playback:", err);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_STREAM_URL_KEY);
      }
    };

    restorePlayback();

    // Cleanup on unmount
    return () => {
      // Don't stop audio on unmount - let it continue playing
      // The audio will be cleaned up when the page is refreshed or closed
    };
  }, [mounted]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/media/radio/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to search radio stations");
      }

      const data = await response.json();
      setStations(data.stations || []);
    } catch (err: any) {
      setError(err.message || "Failed to search radio stations");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (station: RadioStation) => {
    try {
      // If the same station is already playing, just ensure it's playing
      if (playingStation?.id === station.id && audioElementRef.current) {
        // If paused, resume playback
        if (audioElementRef.current.paused) {
          audioElementRef.current.play().catch((err) => {
            console.error("Failed to resume playback:", err);
            setError("Failed to resume playback");
          });
        }
        return; // Already playing this station
      }

      // Stop any currently playing station (different station)
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current = null;
      }

      // Clear previous storage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_STREAM_URL_KEY);

      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      // Get stream URL from backend (for security)
      const response = await fetch(`/api/media/radio/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stationId: station.id, url: station.url }),
      });

      if (!response.ok) {
        throw new Error("Failed to get stream URL");
      }

      const data = await response.json();
      
      // Create audio element with proper settings
      const audio = new Audio(data.streamUrl);
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      
      // Set up event handlers before playing
      audio.onended = () => {
        setPlayingStation(null);
        audioElementRef.current = null;
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_STREAM_URL_KEY);
      };

      audio.onerror = (e) => {
        console.error("Audio error:", e);
        setError("Failed to play stream");
        setPlayingStation(null);
        audioElementRef.current = null;
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_STREAM_URL_KEY);
      };

      // Store reference and station state
      audioElementRef.current = audio;
      setPlayingStation(station);

      // Save to localStorage for persistence
      localStorage.setItem(STORAGE_KEY, JSON.stringify(station));
      localStorage.setItem(STORAGE_STREAM_URL_KEY, data.streamUrl);

      // Play the audio
      audio.play().catch((err) => {
        console.error("Failed to play audio:", err);
        setError("Failed to play stream. Please try again.");
      });
    } catch (err: any) {
      setError(err.message || "Failed to play station");
    }
  };

  const handleStop = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    setPlayingStation(null);
    // Clear localStorage when stopped
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_STREAM_URL_KEY);
  };

  return (
    <Box>
      <PanelHeader
        title="Radio Browser"
        description="Browse and stream online radio stations"
      />

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

          {/* Now Playing Section - CRITICAL: Always render identical structure */}
          {/* Server: Box with empty content (playingStation = null, mounted = false) */}
          {/* Client first render: Box with empty content (playingStation = null, mounted = false) */}
          {/* After hydration: Box with Card content (playingStation set, mounted = true) */}
          {/* The Box wrapper ensures structure consistency */}
          {mounted && playingStation ? (
            <Box sx={{ mb: 3 }} suppressHydrationWarning>
              <Card
                sx={{
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                    <RadioOutlinedIcon sx={{ fontSize: 32 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Now Playing
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {playingStation.name}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {playingStation.country}
                        {playingStation.tags && ` • ${playingStation.tags}`}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    onClick={handleStop}
                    sx={{
                      color: "primary.contrastText",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.3)",
                      },
                    }}
                  >
                    <StopOutlinedIcon />
                  </IconButton>
                </Box>
              </Card>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }} suppressHydrationWarning />
          )}

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search radio stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RadioOutlinedIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchOutlinedIcon />}
            >
              Search
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {stations.length > 0 && (
            <List>
              {stations.map((station) => (
                <ListItem
                  key={station.id}
                  sx={{
                    border: 1,
                    borderColor: playingStation?.id === station.id ? "primary.main" : "divider",
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: playingStation?.id === station.id ? "action.selected" : "transparent",
                  }}
                >
                  <ListItemText
                    primary={station.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {station.country}
                        </Typography>
                        {station.tags && (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              {" • "}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {station.tags}
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handlePlay(station)}
                      color={playingStation?.id === station.id ? "primary" : "default"}
                    >
                      <PlayArrowOutlinedIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          {!loading && stations.length === 0 && searchQuery && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No stations found. Try a different search term.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

