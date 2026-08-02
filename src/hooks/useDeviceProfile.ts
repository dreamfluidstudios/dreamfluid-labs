"use client";

import { useEffect, useState } from "react";
import {
  applyDeviceDataset,
  resolveDeviceProfile,
  subscribeDeviceProfile,
  type DeviceProfile,
} from "@/utils/deviceProfile";

// Desktop-capable stub until mount — avoids SSR/client hydration mismatch and
// keeps effects on until we know the real (or forced) profile.
const SSR_PROFILE = resolveDeviceProfile();

export const useDeviceProfile = (): DeviceProfile => {
  const [profile, setProfile] = useState<DeviceProfile>(SSR_PROFILE);

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
