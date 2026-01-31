import dynamic from "next/dynamic";

const ActivityPanel = dynamic(
  () => import("@/components/panels/activity/activity-panel").then((mod) => ({ default: mod.ActivityPanel })),
  { ssr: false }
);

export default function ActivityPage() {
  return <ActivityPanel />;
}

