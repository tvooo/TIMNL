import photoData from '../../data/photo.json';
import type { PhotoData } from '../types/photo';

const data: PhotoData = photoData;

export function Photo() {
  if (!data.image) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold mb-2">No photo</h2>
          <p className="text-gray-600">
            {data.error ?? "Copy images into the photos directory and run 'npm run fetch-photo'"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={data.image}
      alt=""
      width={800}
      height={600}
      // Drawn 1:1 at capture size on purpose: any scaling would smear the
      // Floyd-Steinberg dither fetch-photo.ts baked in for the panel's 16 greys.
      style={{ imageRendering: 'pixelated' }}
      className="block w-[800px] h-[600px]"
    />
  );
}
