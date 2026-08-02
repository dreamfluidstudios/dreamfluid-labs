"use client";

import { useDeviceProfile } from "@/hooks/useDeviceProfile";

// Mount once near the root so `html[data-device]` is set for CSS budgets and
// forced `?device=touch|desktop` / FORCE_DEVICE overrides apply site-wide.
export const DeviceProfileSync = () => {
  useDeviceProfile();
  return null;
};
