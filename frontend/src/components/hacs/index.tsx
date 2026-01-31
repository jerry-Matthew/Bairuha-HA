/**
 * HACS Module Entry Point
 * 
 * Uses dynamic import with SSR disabled to ensure client-only rendering
 * This prevents SWC from misclassifying the module as server-only
 */

import React, { Suspense } from "react";

const HacsPanelClient = React.lazy(() => import("./client/HacsPanel.client").then((mod) => ({ default: mod.HacsPanel })));

function HacsPanel() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <p>Loading HACS...</p>
      </div>
    }>
      <HacsPanelClient />
    </Suspense>
  );
}

export default HacsPanel;
export { HacsPanel };

