// Output devices. Shared by App.tsx (frame size), capture.ts and
// fetch-photo.ts (image preparation). Pages are rendered once per display,
// selected with the `?display=<name>` query parameter (default: kindle).

export interface DisplayConfig {
  width: number;
  height: number;
  /** Grey levels the panel can show. */
  grayLevels: number;
  /** Degrees to rotate the captured screenshot by (panel mounting). */
  rotate: number;
  /** Write a packed greyscale PNG at this depth instead of 8-bit. */
  bitDepth?: 1 | 2 | 4;
}

export type DisplayName = 'kindle' | 'trmnl';

export const DISPLAYS: Record<DisplayName, DisplayConfig> = {
  // Jailbroken Kindle 4, mounted rotated CCW
  kindle: { width: 800, height: 600, grayLevels: 16, rotate: 90 },
  // reTerminal E1001 on TRMNL firmware
  trmnl: { width: 800, height: 480, grayLevels: 4, rotate: 0, bitDepth: 2 },
};

export function isDisplayName(name: string | null): name is DisplayName {
  return name !== null && name in DISPLAYS;
}
