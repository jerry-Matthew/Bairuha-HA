"use client";

import { NotificationsPanel } from "@/components/panels/notifications/notifications-panel";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/selectors";

export default function NotificationsPage() {
  const user = useAppSelector(selectUser);
  
  // TODO: Get actual user ID from auth when authentication is fully implemented
  // For now, using a placeholder - in production this should come from the authenticated user
  const userId = user?.id || "placeholder-user-id";

  return <NotificationsPanel userId={userId} />;
}
