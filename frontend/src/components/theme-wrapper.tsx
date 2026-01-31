"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getTheme } from "@/lib/theme";
import { selectDarkMode } from "@/store/selectors";
import { updateSettings } from "@/store/slices/settings-slice";

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  // Read darkMode from Redux - always available, defaults to false
  // This ensures consistent theme calculation between SSR and client
  const darkMode = useSelector(selectDarkMode);

  // Hydrate theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("darkMode");
      if (storedTheme !== null) {
        const isDark = storedTheme === "true";
        if (isDark !== darkMode) {
          dispatch(updateSettings({ darkMode: isDark }));
        }
      }
    }
  }, [dispatch]); // Run once on mount

  // Always compute theme deterministically - no mounted gating
  // MUI ThemeProvider is SSR-safe and handles theme updates internally
  const theme = getTheme(darkMode ? "dark" : "light");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

