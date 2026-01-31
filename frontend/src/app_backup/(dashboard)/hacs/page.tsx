import HacsPanel from "@/components/hacs";

// Force dynamic rendering to prevent SSR/hydration issues
export const dynamic = "force-dynamic";

export default function HACSPage() {
  return <HacsPanel />;
}

