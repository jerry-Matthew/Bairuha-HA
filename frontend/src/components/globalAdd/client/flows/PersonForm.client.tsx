"use client";

import React, { useState } from "react";
import { TextField, Box, Typography, Avatar } from "@mui/material";

interface PersonFormProps {
  name: string;
  photoUrl: string;
  onNameChange: (value: string) => void;
  onPhotoUrlChange: (value: string) => void;
  disabled?: boolean;
}

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true; // Empty is valid (optional)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function PersonForm({
  name,
  photoUrl,
  onNameChange,
  onPhotoUrlChange,
  disabled,
}: PersonFormProps) {
  const [urlError, setUrlError] = useState(false);

  const handleUrlChange = (value: string) => {
    onPhotoUrlChange(value);
    setUrlError(value.trim() ? !isValidUrl(value) : false);
  };

  return (
    <Box>
      <TextField
        fullWidth
        label="Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        required
        disabled={disabled}
        sx={{ mb: 2 }}
        placeholder="e.g., John Doe"
      />

      <TextField
        fullWidth
        label="Photo URL (optional)"
        value={photoUrl}
        onChange={(e) => handleUrlChange(e.target.value)}
        placeholder="https://example.com/photo.jpg"
        disabled={disabled}
        error={urlError}
        helperText={
          urlError
            ? "Please enter a valid URL"
            : "URL to person's photo. You can also upload to /uploads and use that path."
        }
        sx={{ mb: 2 }}
      />

      {photoUrl && isValidUrl(photoUrl) && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2, p: 2, bgcolor: "rgba(0, 0, 0, 0.02)", borderRadius: 1 }}>
          <Avatar src={photoUrl} alt={name || "Person"} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="body2" fontWeight={500}>
              Photo Preview
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {photoUrl}
            </Typography>
          </Box>
        </Box>
      )}

      {name && !photoUrl && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2, p: 2, bgcolor: "rgba(0, 0, 0, 0.02)", borderRadius: 1 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main" }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" color="text.secondary">
            Initials will be used if no photo is provided
          </Typography>
        </Box>
      )}
    </Box>
  );
}

