// Navigation configuration
export const NAVIGATION_ITEMS = [
  { label: "Overview", path: "/overview" },
  { label: "Map", path: "/map" },
  { label: "Energy", path: "/energy" },
  { label: "Activity", path: "/activity" },
  { label: "History", path: "/history" },
  { label: "Settings", path: "/settings" },
  { label: "Profile", path: "/profile" },
] as const;

export const DRAWER_WIDTH = 280;
export const DRAWER_WIDTH_COLLAPSED = 80;

// Date range options
export const DATE_RANGE_OPTIONS = [
  { value: "1h", label: "Last Hour" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
] as const;

// Activity filter options
export const ACTIVITY_FILTER_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "state_change", label: "State Changes" },
  { value: "trigger", label: "Triggers" },
  { value: "action", label: "Actions" },
] as const;


