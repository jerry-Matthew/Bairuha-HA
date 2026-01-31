"use client";

import { Box, Typography, Card, CardContent } from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import VideocamOffOutlinedIcon from "@mui/icons-material/VideocamOffOutlined";

export function CameraPanel() {
  return (
    <Box>
      <PanelHeader
        title="Camera"
        description="View camera streams and snapshots"
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
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 8,
          }}
        >
          <VideocamOffOutlinedIcon
            sx={{
              fontSize: 64,
              color: "text.secondary",
              mb: 2,
            }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No cameras configured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 400 }}>
            Camera integration is ready for future implementation. This architecture supports real camera stream integration.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

