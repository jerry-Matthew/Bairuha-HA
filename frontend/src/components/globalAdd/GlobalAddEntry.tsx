/**
 * Global Add Menu Entry Point
 * 
 * Uses dynamic import with SSR disabled to ensure client-only rendering
 * This prevents SWC from misclassifying the module as server-only
 */

import React, { Suspense } from "react";

const GlobalAddMenu = React.lazy(() => import("./client/GlobalAddMenu.client").then((mod) => ({ default: mod.GlobalAddMenu })));

export default function GlobalAddEntry() {
  return (
    <Suspense fallback={null}>
      <GlobalAddMenu />
    </Suspense>
  );
}

