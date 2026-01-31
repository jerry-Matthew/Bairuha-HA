"use client";

import React, { useState } from "react";
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Avatar,
  IconButton,
  Chip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { HacsActionsMenu } from "./HacsActionsMenu.client";
import { HacsDetailsDrawer } from "./HacsDetailsDrawer.client";
import { InstallationInstructionsDialog } from "./InstallationInstructionsDialog";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";
import type { HacsExtension } from "../server/hacs.types";

interface HacsRowProps {
  extension: HacsExtension;
  onUpdate: (extension: HacsExtension) => void;
  installedOnHA: string[];
}

export function HacsRow({ extension, onUpdate, installedOnHA }: HacsRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const isInstalling = extension.status === "installing";

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleShowDetails = () => {
    setDetailsOpen(true);
    handleMenuClose();
  };

  const handleShowInstructions = () => {
    setInstructionsOpen(true);
  };

  const handleExtensionUpdate = (updated: HacsExtension) => {
    onUpdate(updated);
    handleMenuClose();
  };

  return (
    <>
      <TableRow
        sx={{
          "&:hover": {
            backgroundColor: "action.hover",
          },
          cursor: "pointer",
          opacity: isInstalling ? 0.6 : 1,
        }}
        onClick={() => {
          if (!menuAnchor && !isInstalling) {
            setDetailsOpen(true);
          }
        }}
      >
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Avatar
              src={extension.avatarUrl}
              alt={extension.name}
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                bgcolor: extension.avatarUrl ? "transparent" : "action.disabled",
              }}
            >
              {!extension.avatarUrl && extension.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {extension.name}
                </Typography>
                <IntegrationStatusBadge
                  domain={extension.domain}
                  installedOnHA={installedOnHA}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                {extension.description || "No description available"}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {extension.downloads.toLocaleString()}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{extension.stars.toLocaleString()}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{extension.lastActivity}</Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={extension.type}
            size="small"
            sx={{
              fontSize: "0.75rem",
              height: 24,
            }}
          />
        </TableCell>
        <TableCell align="right">
          <IconButton
            size="small"
            disabled={isInstalling}
            onClick={handleMenuOpen}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      <HacsActionsMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        extension={extension}
        onShowDetails={handleShowDetails}
        onShowInstructions={handleShowInstructions}
        onUpdate={handleExtensionUpdate}
      />

      <HacsDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        extensionId={extension.id}
        onUpdate={handleExtensionUpdate}
      />

      <InstallationInstructionsDialog
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        extension={extension}
      />
    </>
  );
}

