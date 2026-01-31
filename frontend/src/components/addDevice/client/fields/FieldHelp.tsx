/**
 * Field Help Component
 * 
 * Displays help text, tooltips, and documentation links for fields
 */

import React from "react";
import { Box, Typography, Link, Tooltip, IconButton } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { ConfigFieldSchema } from "../../server/integration-config-schemas";

interface FieldHelpProps {
  fieldSchema: ConfigFieldSchema;
  fieldName: string;
}

export function FieldHelp({ fieldSchema, fieldName }: FieldHelpProps) {
  const hasTooltip = !!fieldSchema.tooltip;
  const hasHelpText = !!fieldSchema.helpText;
  const hasDocumentation = !!fieldSchema.documentation;
  
  if (!hasTooltip && !hasHelpText && !hasDocumentation) {
    return null;
  }
  
  return (
    <Box sx={{ mt: 0.5, display: "flex", alignItems: "flex-start", gap: 1 }}>
      {/* Tooltip icon */}
      {hasTooltip && (
        <Tooltip title={fieldSchema.tooltip!} arrow>
          <IconButton size="small" sx={{ p: 0.5 }}>
            <HelpOutlineIcon fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
      )}
      
      {/* Help text */}
      {hasHelpText && (
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {fieldSchema.helpText}
        </Typography>
      )}
      
      {/* Documentation link */}
      {hasDocumentation && (
        <Link
          href={fieldSchema.documentation}
          target="_blank"
          rel="noopener noreferrer"
          variant="caption"
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          Documentation
          <OpenInNewIcon fontSize="small" />
        </Link>
      )}
    </Box>
  );
}
