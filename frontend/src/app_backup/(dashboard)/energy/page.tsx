import dynamic from "next/dynamic";

const EnergyPanel = dynamic(
  () => import("@/components/panels/energy/energy-panel").then((mod) => ({ default: mod.EnergyPanel })),
  { ssr: false }
);

export default function EnergyPage() {
  return <EnergyPanel />;
}

