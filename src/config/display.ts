// The panel: reTerminal E1001 on TRMNL firmware. Shared by App.tsx (frame
// size), capture.ts and fetch-photo.ts (image preparation).
export const DISPLAY = {
  width: 800,
  height: 480,
  /** Grey levels the panel can show. */
  grayLevels: 4,
  /** Depth of the packed greyscale PNGs served to the device. */
  bitDepth: 2,
} as const;
