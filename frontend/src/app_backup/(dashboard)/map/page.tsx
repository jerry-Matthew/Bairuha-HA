import dynamic from "next/dynamic";

const MapPanel = dynamic(
  () => import("@/components/panels/map/map-panel").then((mod) => ({ default: mod.MapPanel })),
  { ssr: false }
);

export default function MapPage() {
  return <MapPanel />;
}

