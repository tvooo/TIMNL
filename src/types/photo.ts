import type { DisplayName } from '../config/displays';

export interface PhotoData {
  fetchedAt: string;
  /** URL of the prepared image per display, served from `public/`. Empty when unavailable. */
  images: Partial<Record<DisplayName, string>>;
  /** Source filename in the photos directory. */
  file: string;
  /** Position in the round-robin rotation. */
  index: number;
  count: number;
  error?: string;
}
