// config/flags.ts
export const FEATURE_LIVE_LOGISTICS =
  (process.env.EXPO_PUBLIC_FEATURE_LIVE_LOGISTICS ?? "off") === "on";
