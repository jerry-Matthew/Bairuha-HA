"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { WbSunny, Cloud, WaterDrop, Air } from "@mui/icons-material";

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
}

interface WeatherCardProps {
  lat?: number;
  lon?: number;
  city?: string;
}

export function WeatherCard({ lat, lon, city }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchWeather() {
      try {
        setLoading(true);
        setError(null);

        // Build query string
        const params = new URLSearchParams();
        if (lat !== undefined && lon !== undefined) {
          params.set("lat", lat.toString());
          params.set("lon", lon.toString());
        } else if (city) {
          params.set("city", city);
        }

        const response = await fetch(`/api/weather?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: "Failed to fetch weather",
          }));
          throw new Error(errorData.error || "Failed to fetch weather");
        }

        const data = await response.json();
        if (mounted) {
          setWeather(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Failed to load weather");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchWeather();

    return () => {
      mounted = false;
    };
  }, [lat, lon, city]);

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes("clear") || lowerCondition.includes("sun")) {
      return <WbSunny sx={{ fontSize: "inherit", color: "warning.main" }} />;
    }
    return <Cloud sx={{ fontSize: "inherit", color: "text.secondary" }} />;
  };

  if (loading) {
    return (
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
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
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
          }}
        >
          <CircularProgress size={40} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "background.paper",
          borderRadius: 2,
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 2px 8px rgba(0, 0, 0, 0.3)"
              : "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <CardContent>
          <Alert severity="info" sx={{ mb: 0 }}>
            Weather unavailable
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.paper",
        borderRadius: 2,
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 2px 8px rgba(0, 0, 0, 0.3)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 4px 16px rgba(0, 0, 0, 0.4)"
              : "0 4px 16px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{ 
                color: "primary.main", 
                fontWeight: "bold",
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              Weather
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {weather.location}
            </Typography>
          </Box>
          <Box sx={{ fontSize: { xs: 36, sm: 48 }, flexShrink: 0 }}>
            {getWeatherIcon(weather.condition)}
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: "bold", 
              mb: 0.5,
              fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            {weather.temperature}°C
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {weather.condition}
          </Typography>
        </Box>

        {(weather.humidity !== undefined || weather.windSpeed !== undefined) && (
          <Box
            sx={{
              display: "flex",
              gap: { xs: 2, sm: 3 },
              mt: 2,
              pt: 2,
              borderTop: 1,
              borderColor: "divider",
              flexWrap: "wrap",
            }}
          >
            {weather.humidity !== undefined && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <WaterDrop sx={{ fontSize: { xs: 18, sm: 20 }, color: "primary.main" }} />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  {weather.humidity}%
                </Typography>
              </Box>
            )}
            {weather.windSpeed !== undefined && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Air sx={{ fontSize: { xs: 18, sm: 20 }, color: "primary.main" }} />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  }}
                >
                  {weather.windSpeed} km/h
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

