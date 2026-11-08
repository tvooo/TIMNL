export interface PhotoData {
  fetchedAt: string;
  /** URL of the prepared image, served from `public/`. Empty when unavailable. */
  image: string;
  /** Source filename in the photos directory. */
  file: string;
  /** Position in the round-robin rotation. */
  index: number;
  count: number;
  error?: string;
}
