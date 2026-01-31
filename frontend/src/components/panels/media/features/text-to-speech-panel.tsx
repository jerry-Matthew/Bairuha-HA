"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Chip,
} from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import StopOutlinedIcon from "@mui/icons-material/StopOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import { useAuth } from "@/contexts/auth-context";

const MAX_TEXT_LENGTH = 5000;
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
];

const VOICES: Record<string, string[]> = {
  en: ["en-US-Standard-A", "en-US-Standard-B", "en-US-Standard-C", "en-US-Standard-D"],
  es: ["es-ES-Standard-A", "es-ES-Standard-B"],
  fr: ["fr-FR-Standard-A", "fr-FR-Standard-B"],
  de: ["de-DE-Standard-A", "de-DE-Standard-B"],
  it: ["it-IT-Standard-A"],
  pt: ["pt-PT-Standard-A"],
};

interface TTSEntry {
  id: string;
  text: string;
  language: string;
  voice: string | null;
  url: string;
  size: number;
  createdAt: string;
}

export function TextToSpeechPanel() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [voice, setVoice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [entries, setEntries] = useState<TTSEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [playingEntryId, setPlayingEntryId] = useState<string | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    loadEntries();
  }, [accessToken]);

  const loadEntries = async () => {
    setLoadingEntries(true);
    setError(null);

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/media/tts", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load TTS entries");
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err: any) {
      console.error("Failed to load TTS entries:", err);
      // Don't show error for loading, just log it
    } finally {
      setLoadingEntries(false);
    }
  };

  // Set default voice when language changes
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    const voices = VOICES[newLanguage] || [];
    if (voices.length > 0) {
      setVoice(voices[0]);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      setError(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
      return;
    }

    setGenerating(true);
    setError(null);
    setAudioUrl(null);

    // Stop any currently playing audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/media/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          language,
          voice: voice || VOICES[language]?.[0] || "en-US-Standard-A",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle "Not Implemented" status gracefully
        if (response.status === 501) {
          setError(errorData.message || errorData.error || "TTS service is not yet configured. This feature requires backend service setup.");
          return;
        }
        throw new Error(errorData.error || "Failed to generate speech");
      }

      const data = await response.json();
      
      // Check if audioUrl is provided
      if (!data.audioUrl) {
        setError("TTS service is not yet configured. This feature requires backend service setup.");
        return;
      }
      
      setAudioUrl(data.audioUrl);
      
      // Reload entries to show the new one
      await loadEntries();
      
      // Clear the form
      setText("");
    } catch (err: any) {
      setError(err.message || "Failed to generate speech");
    } finally {
      setGenerating(false);
    }
  };

  const handlePlay = () => {
    if (!audioUrl) return;

    // Stop any currently playing audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    const newAudio = new Audio(audioUrl);
    newAudio.play();
    setAudio(newAudio);

    newAudio.onended = () => setAudio(null);
    newAudio.onerror = () => {
      setError("Failed to play audio");
      setAudio(null);
    };
  };

  const handleStop = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }
    setPlayingEntryId(null);
  };

  const handlePlayEntry = (entry: TTSEntry) => {
    // Stop any currently playing audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }

    const newAudio = new Audio(entry.url);
    newAudio.play();
    setAudio(newAudio);
    setPlayingEntryId(entry.id);

    newAudio.onended = () => {
      setAudio(null);
      setPlayingEntryId(null);
    };
    newAudio.onerror = () => {
      setError("Failed to play audio");
      setAudio(null);
      setPlayingEntryId(null);
    };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getLanguageLabel = (langCode: string): string => {
    const lang = LANGUAGES.find((l) => l.value === langCode);
    return lang ? lang.label : langCode.toUpperCase();
  };

  const availableVoices = VOICES[language] || [];

  return (
    <Box>
      <PanelHeader
        title="Text-to-Speech"
        description="Convert text to audio"
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

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Text to convert"
              multiline
              rows={6}
              fullWidth
              value={text}
              onChange={(e) => {
                const newText = e.target.value;
                if (newText.length <= MAX_TEXT_LENGTH) {
                  setText(newText);
                }
              }}
              helperText={`${text.length} / ${MAX_TEXT_LENGTH} characters`}
              placeholder="Enter the text you want to convert to speech..."
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={language}
                  label="Language"
                  onChange={(e) => handleLanguageChange(e.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Voice</InputLabel>
                <Select
                  value={voice}
                  label="Voice"
                  onChange={(e) => setVoice(e.target.value)}
                  disabled={availableVoices.length === 0}
                >
                  {availableVoices.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={generating || !text.trim()}
                startIcon={generating ? <CircularProgress size={20} /> : null}
              >
                {generating ? "Generating..." : "Generate Speech"}
              </Button>

              {audioUrl && (
                <>
                  <IconButton
                    color="primary"
                    onClick={handlePlay}
                    disabled={!!audio}
                  >
                    <PlayArrowOutlinedIcon />
                  </IconButton>
                  {audio && (
                    <IconButton color="primary" onClick={handleStop}>
                      <StopOutlinedIcon />
                    </IconButton>
                  )}
                </>
              )}
            </Box>

            {audioUrl && !audio && (
              <Alert severity="success">
                Audio generated successfully. Click play to listen.
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Saved TTS Entries */}
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
          <Typography variant="h6" gutterBottom>
            Saved TTS Entries
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loadingEntries ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : entries.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
              }}
            >
              <VolumeUpOutlinedIcon
                sx={{
                  fontSize: 48,
                  color: "text.secondary",
                  mb: 1,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                No TTS entries yet. Generate some speech to see them here.
              </Typography>
            </Box>
          ) : (
            <List>
              {entries.map((entry) => (
                <ListItem
                  key={entry.id}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>
                    <VolumeUpOutlinedIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                        <Typography variant="body1" sx={{ wordBreak: "break-word" }}>
                          {entry.text.length > 100
                            ? `${entry.text.substring(0, 100)}...`
                            : entry.text}
                        </Typography>
                        <Chip
                          label={getLanguageLabel(entry.language)}
                          size="small"
                          sx={{ height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(entry.size)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(entry.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() =>
                        playingEntryId === entry.id ? handleStop() : handlePlayEntry(entry)
                      }
                      color="primary"
                    >
                      {playingEntryId === entry.id ? (
                        <StopOutlinedIcon />
                      ) : (
                        <PlayArrowOutlinedIcon />
                      )}
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

