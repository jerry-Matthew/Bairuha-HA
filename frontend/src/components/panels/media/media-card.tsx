"use client";

import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Box,
  Typography,
} from "@mui/material";
import { useAppSelector } from "@/store/hooks";
import { selectDarkMode } from "@/store/selectors";

interface MediaCardProps {
  title: string;
  description: string;
  icon: React.ComponentType;
  path: string;
}

export function MediaCard({ title, description, icon: Icon, path }: MediaCardProps) {
  const navigate = useNavigate();
  const darkMode = useAppSelector(selectDarkMode);

  const handleClick = () => {
    navigate(path);
  };

  return (
    <Card
      onClick={handleClick}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        backgroundColor: "background.paper",
        borderRadius: 2,
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 2px 8px rgba(0, 0, 0, 0.3)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 4px 16px rgba(0, 0, 0, 0.4)"
              : "0 4px 16px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          py: 4,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: darkMode
              ? "rgba(0, 206, 209, 0.2)"
              : "rgba(0, 206, 209, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: darkMode
                ? "rgba(0, 206, 209, 0.3)"
                : "rgba(0, 206, 209, 0.2)",
              transform: "scale(1.1)",
            },
          }}
        >
          <Icon
            sx={{
              fontSize: 32,
              color: "primary.main",
            }}
          />
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1,
            color: "text.primary",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.875rem",
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

