import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";

// Entities selectors
export const selectEntities = (state: RootState) => state.entities.entities;
export const selectEntityById = (id: string) => (state: RootState) =>
  state.entities.entities.find((entity) => entity.id === id);

// Activities selectors
export const selectActivities = (state: RootState) => state.activities.activities;
export const selectRecentActivities = createSelector(
  [selectActivities],
  (activities) => activities.slice(0, 10)
);

// Settings selectors
export const selectSettings = (state: RootState) => state.settings.settings;
export const selectDarkMode = (state: RootState) => state.settings.settings.darkMode;
export const selectNotifications = (state: RootState) =>
  state.settings.settings.notifications;

// User selectors
export const selectUser = (state: RootState) => state.user.user;
export const selectUserRole = (state: RootState) => state.user.user?.role ?? null;








