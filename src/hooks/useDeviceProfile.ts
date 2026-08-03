"use client";

import { useEffect, useState } from "react";
import {
  applyDeviceDataset,
  resolveDeviceProfile,
  subscribeDeviceProfile,
  type DeviceProfile,
} from "@/utils/deviceProfile";

// Server stub is desktop-capable. On the client, resolve immediately so the
// first paint matches touch/desktop (avoids briefly hiding the DOM tile bed
// while the lens is already arcs-only).
const SSR_PROFILE = resolveDeviceProfile();

export const useDeviceProfile = (): DeviceProfile => {
  const [profile, setProfile] = useState<DeviceProfile>(() =>
    typeof window === "undefined" ? SSR_PROFILE : resolveDeviceProfile(),
  );

  useEffect(() => {
    const next = resolveDeviceProfile();
    setProfile(next);
    applyDeviceDataset(next);
    return subscribeDeviceProfile((p) => {
      setProfile(p);
      applyDeviceDataset(p);
    });
  }, []);

  return profile;
};
