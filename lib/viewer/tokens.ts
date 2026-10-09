/** Design-system contract for the shared viewer. Components consume these names. */
export const VIEWER_TOKEN_NAMES = [
  "--vv-color-canvas",
  "--vv-color-ink",
  "--vv-color-muted",
  "--vv-color-accent",
  "--vv-color-accent-ink",
  "--vv-color-surface",
  "--vv-color-danger",
  "--vv-radius-control",
  "--vv-space-1",
  "--vv-space-2",
  "--vv-space-3",
  "--vv-space-4",
  "--vv-space-5",
  "--vv-control-size",
  "--vv-font-sans",
  "--vv-motion-duration",
] as const;

export const VIEWER_CONTROL_MIN_SIZE = "2.75rem";
