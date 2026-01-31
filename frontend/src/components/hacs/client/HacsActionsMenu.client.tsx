"use client";

import React from "react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CodeIcon from "@mui/icons-material/Code";
import RefreshIcon from "@mui/icons-material/Refresh";
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop";
import BugReportIcon from "@mui/icons-material/BugReport";
import type { HacsExtension } from "../server/hacs.types";

interface HacsActionsMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  extension: HacsExtension;
  onShowDetails: () => void;
  onShowInstructions: () => void;
  onUpdate: (extension: HacsExtension) => void;
}

export function HacsActionsMenu({
  anchorEl,
  open,
  onClose,
  extension,
  onShowDetails,
  onShowInstructions,
  onUpdate,
}: HacsActionsMenuProps) {
  const handleShowDetails = () => {
    onShowDetails();
  };

  const handleOpenRepository = () => {
    const repoUrl = `https://github.com/${extension.githubRepo}`;
    window.open(repoUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleRefresh = async () => {
    try {
      const response = await fetch(`/api/hacs/${extension.id}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Refresh error:", errorData.message || "Failed to refresh");
        return;
      }

      const data = await response.json();
      if (data.success && data.extension) {
        onUpdate(data.extension);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    }
    onClose();
  };

  const handleDownload = async () => {
    try {
      // Optimistic update or just trigger
      const response = await fetch(`/api/hacs/${extension.id}/install`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Install error:", errorData.message || "Failed to install");
        // You might want to show a toast here in a real app
        return;
      }

      const data = await response.json();
      if (data.success && data.extension) {
        onUpdate(data.extension);
      }
    } catch (error) {
      console.error("Install error:", error);
    }
    onClose();
  };

  const handleShowInstructions = () => {
    onShowInstructions();
    onClose();
  };

  const handleOpenIssues = () => {
    const issuesUrl = `https://github.com/${extension.githubRepo}/issues`;
    window.open(issuesUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const isInstalled = extension.status === "installed";

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      PaperProps={{
        sx: {
          mt: 1,
          minWidth: 200,
          borderRadius: "8px",
        },
      }}
    >
      <MenuItem onClick={handleShowDetails}>
        <ListItemIcon>
          <InfoIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Show details</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleDownload}>
        <ListItemIcon>
          <InstallDesktopIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{isInstalled ? "Redownload" : "Download"}</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleOpenRepository}>
        <ListItemIcon>
          <CodeIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Repository</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleRefresh}>
        <ListItemIcon>
          <RefreshIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Update information</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleShowInstructions}>
        <ListItemIcon>
          <InstallDesktopIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>View Installation Guide</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleOpenIssues}>
        <ListItemIcon>
          <BugReportIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Open issue</ListItemText>
      </MenuItem>
    </Menu>
  );
}

