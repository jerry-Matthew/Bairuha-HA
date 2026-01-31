import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ActivityEvent } from "@/types";

interface ActivitiesState {
  activities: ActivityEvent[];
}

const initialState: ActivitiesState = {
  activities: [],
};

export const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    addActivity: (state, action: PayloadAction<ActivityEvent>) => {
      state.activities.unshift(action.payload);
      // Keep last 100 activities
      if (state.activities.length > 100) {
        state.activities = state.activities.slice(0, 100);
      }
    },
    setActivities: (state, action: PayloadAction<ActivityEvent[]>) => {
      state.activities = action.payload;
    },
  },
});

export const { addActivity, setActivities } = activitiesSlice.actions;








