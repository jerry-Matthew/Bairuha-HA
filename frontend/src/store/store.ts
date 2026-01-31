import { configureStore } from "@reduxjs/toolkit";
import { entitiesSlice } from "./slices/entities-slice";
import { activitiesSlice } from "./slices/activities-slice";
import { settingsSlice } from "./slices/settings-slice";
import { userSlice } from "./slices/user-slice";

export const store = configureStore({
  reducer: {
    entities: entitiesSlice.reducer,
    activities: activitiesSlice.reducer,
    settings: settingsSlice.reducer,
    user: userSlice.reducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;








