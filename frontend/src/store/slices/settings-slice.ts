import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SystemSettings } from "@/types";

// Always use false as default to ensure server and client render the same initial state
// This prevents hydration mismatches. The theme will be synced from localStorage after mount.
const defaultSettings: SystemSettings = {
  name: "Home Assistant",
  location: "Home",
  timezone: "America/New_York",
  unitSystem: "imperial",
  darkMode: false, // Always start with false for consistent SSR
  notifications: true,
};

interface SettingsState {
  settings: SystemSettings;
}

const initialState: SettingsState = {
  settings: defaultSettings,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SystemSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };

      // Persist darkMode to localStorage when it changes
      if (action.payload.darkMode !== undefined && typeof window !== "undefined") {
        try {
          localStorage.setItem("darkMode", String(action.payload.darkMode));
        } catch (error) {
          console.error("Failed to save darkMode to localStorage:", error);
        }
      }
    },
    resetSettings: (state) => {
      state.settings = defaultSettings;
      // Also reset localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("darkMode", String(defaultSettings.darkMode));
        } catch (error) {
          console.error("Failed to reset darkMode in localStorage:", error);
        }
      }
    },
  },
});

export const { updateSettings, resetSettings } = settingsSlice.actions;





