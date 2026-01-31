"use client";

import { Grid, Box } from "@mui/material";
import { PanelHeader } from "@/components/ui/panel-header";
import { MediaCard } from "./media-card";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import RadioOutlinedIcon from "@mui/icons-material/RadioOutlined";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import RecordVoiceOverOutlinedIcon from "@mui/icons-material/RecordVoiceOverOutlined";

interface MediaFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType;
  path: string;
}

const mediaFeatures: MediaFeature[] = [
  {
    id: "camera",
    title: "Camera",
    description: "View camera streams and snapshots",
    icon: VideocamOutlinedIcon,
    path: "/media/camera",
  },
  {
    id: "image-upload",
    title: "Image Upload",
    description: "Upload and manage images",
    icon: ImageOutlinedIcon,
    path: "/media/upload",
  },
  {
    id: "my-media",
    title: "My Media",
    description: "Browse your uploaded media files",
    icon: FolderOutlinedIcon,
    path: "/media/library",
  },
  {
    id: "radio-browser",
    title: "Radio Browser",
    description: "Browse and stream online radio",
    icon: RadioOutlinedIcon,
    path: "/media/radio",
  },
  {
    id: "recordings",
    title: "Recordings",
    description: "View recorded media files",
    icon: VideoLibraryOutlinedIcon,
    path: "/media/recordings",
  },
  {
    id: "text-to-speech",
    title: "Text-to-Speech",
    description: "Convert text to audio",
    icon: RecordVoiceOverOutlinedIcon,
    path: "/media/tts",
  },
];

export function MediaPanel() {
  return (
    <Box>
      <PanelHeader
        title="Media sources"
        description="Access and manage your media content"
      />

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {mediaFeatures.map((feature) => (
          <Grid item xs={12} sm={6} md={4} key={feature.id}>
            <MediaCard
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              path={feature.path}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

