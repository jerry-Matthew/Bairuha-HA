import dynamic from "next/dynamic";

const HistoryPanel = dynamic(
  () => import("@/components/panels/history/history-panel").then((mod) => ({ default: mod.HistoryPanel })),
  { ssr: false }
);

export default function HistoryPage() {
  return <HistoryPanel />;
}

