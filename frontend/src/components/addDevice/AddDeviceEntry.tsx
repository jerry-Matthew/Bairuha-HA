/**
 * Add Device Entry Point
 * 
 * Uses dynamic import with SSR disabled to ensure client-only rendering
 */

import { AddDeviceFlow } from "./client/AddDeviceFlow.client";

interface AddDeviceEntryProps {
  open: boolean;
  onClose: () => void;
}

export default function AddDeviceEntry({ open, onClose }: AddDeviceEntryProps) {
  return <AddDeviceFlow open={open} onClose={onClose} />;
}

