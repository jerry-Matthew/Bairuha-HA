"use client";

import { TodosPanel } from "@/components/panels/todos/todos-panel";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/selectors";

export default function TodosPage() {
  const user = useAppSelector(selectUser);
  
  // Get user ID from Redux store
  const userId = user?.id || "placeholder-user-id";

  return <TodosPanel userId={userId} />;
}
