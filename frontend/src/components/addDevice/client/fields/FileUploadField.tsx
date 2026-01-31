/**
 * File Upload Field Component
 * 
 * Renders file upload field with drag-and-drop support
 */

import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  IconButton,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import type { ConfigFieldSchema } from "../../server/integration-config-schemas";

interface FileUploadFieldProps {
  fieldName: string;
  fieldSchema: ConfigFieldSchema;
  value: string | null; // File ID
  onChange: (fileId: string | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  integrationId: string;
  configEntryId?: string;
}

export function FileUploadField({
  fieldName,
  fieldSchema,
  value,
  onChange,
  error,
  helperText,
  disabled,
  integrationId,
  configEntryId,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    id: string;
    originalFilename: string;
    mimeType: string | null;
    fileSize: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const label = fieldSchema.label || fieldSchema.description || fieldName;
  const accept = fieldSchema.fileConfig?.accept?.join(",");
  const maxSize = fieldSchema.fileConfig?.maxSize;
  const multiple = fieldSchema.fileConfig?.multiple === true;

  // Load file info if value exists
  React.useEffect(() => {
    let active = true;

    if (value) {
      // If we already have info for this ID, don't refetch
      if (fileInfo?.id === value) return;

      const fetchFileInfo = async () => {
        try {
          const response = await fetch(`/api/config/file-upload?id=${value}`);
          if (response.ok && active) {
            const data = await response.json();
            setFileInfo(data.file);
          } else {
            // If fetch fails (e.g. 404), clear value to allow re-upload
            if (active) setFileInfo(null);
          }
        } catch (err) {
          console.error("Failed to fetch file info:", err);
          if (active) setFileInfo(null);
        }
      };

      fetchFileInfo();
    } else {
      setFileInfo(null);
    }

    return () => { active = false; };
  }, [value]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0]; // For now, handle single file
    setErrorMessage(null);

    // Validate file type
    if (fieldSchema.fileConfig?.accept) {
      const isValidType = fieldSchema.fileConfig.accept.some(pattern => {
        if (pattern.endsWith("/*")) {
          const category = pattern.slice(0, -2);
          return file.type.startsWith(category + "/");
        }
        return file.type === pattern;
      });

      if (!isValidType) {
        setErrorMessage(`File type ${file.type} is not allowed. Allowed types: ${fieldSchema.fileConfig.accept.join(", ")}`);
        return;
      }
    }

    // Validate file size
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      setErrorMessage(`File size exceeds maximum allowed size of ${maxSizeMB} MB`);
      return;
    }

    // Upload file
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fieldName", fieldName);
      formData.append("integrationId", integrationId);
      if (configEntryId) {
        formData.append("configEntryId", configEntryId);
      }

      const response = await fetch("/api/config/file-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setFileInfo(data.file);
      onChange(data.file.id);
      setUploadProgress(100);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!value) {
      return;
    }

    try {
      const response = await fetch(`/api/config/file-upload?id=${value}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setFileInfo(null);
      onChange(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Delete failed");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || uploading) {
      return;
    }

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const isImage = fileInfo?.mimeType?.startsWith("image/");

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {label}
      </Typography>

      {fileInfo ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            backgroundColor: "background.default",
          }}
        >
          {isImage && <ImageIcon color="primary" />}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              {fileInfo.originalFilename}
            </Typography>
            {fileInfo.fileSize > 0 && (
              <Typography variant="caption" color="text.secondary">
                {(fileInfo.fileSize / 1024).toFixed(2)} KB
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={handleDelete}
            disabled={disabled}
            color="error"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </Paper>
      ) : (
        <Paper
          variant="outlined"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{
            p: 3,
            textAlign: "center",
            cursor: disabled || uploading ? "not-allowed" : "pointer",
            backgroundColor: "background.default",
            borderStyle: "dashed",
            "&:hover": {
              backgroundColor: disabled || uploading ? undefined : "action.hover",
            },
          }}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={disabled || uploading}
          />

          <UploadFileIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Click to upload or drag and drop
          </Typography>
          {accept && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Allowed types: {fieldSchema.fileConfig?.accept?.join(", ")}
            </Typography>
          )}
          {maxSize && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Max size: {(maxSize / (1024 * 1024)).toFixed(2)} MB
            </Typography>
          )}
        </Paper>
      )}

      {uploading && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {(errorMessage || helperText) && (
        <Alert severity={error || errorMessage ? "error" : "info"} sx={{ mt: 1 }}>
          {errorMessage || helperText}
        </Alert>
      )}
    </Box>
  );
}
