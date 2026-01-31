import { createTheme } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark" = "light") => {
  return createTheme({
    typography: {
      fontFamily: [
        "Inter",
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ].join(","),
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightSemiBold: 600,
      fontWeightBold: 700,
    },
    palette: {
      mode,
      primary: {
        main: "#9333ea", // Purple
        light: "#a855f7",
        dark: "#7e22ce",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#2563eb", // Blue
        light: "#3b82f6",
        dark: "#1d4ed8",
        contrastText: "#ffffff",
      },
      background: {
        default: mode === "dark" ? "#1a2332" : "#ffffff",
        paper: mode === "dark" ? "#243447" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#ffffff" : "#1a1a1a",
        secondary: mode === "dark" ? "rgba(255, 255, 255, 0.7)" : "#666666",
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          contained: {
            background: "linear-gradient(to right, #2563eb, #9333ea)",
            backgroundColor: "transparent !important",
            color: "#ffffff",
            border: "none",
            "&:hover": {
              background: "linear-gradient(to right, #1d4ed8, #7e22ce)",
              backgroundColor: "transparent !important",
            },
            "&:disabled": {
              background: "linear-gradient(to right, rgba(37, 99, 235, 0.5), rgba(147, 51, 234, 0.5))",
              backgroundColor: "transparent !important",
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "dark" ? "#243447" : "#ffffff",
            color: mode === "dark" ? "#ffffff" : "#1a1a1a",
          },
        },
      },
    },
  });
};

// Default export for backward compatibility
export const theme = getTheme("light");


