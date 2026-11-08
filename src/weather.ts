import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Snowflake,
  Sun,
  SunDim,
  type LucideIcon,
} from 'lucide-react';
import weatherData from '../data/weather.json';
import { WEATHER_CODES, type WeatherData } from './types/weather';

export const weather: WeatherData = weatherData;

// WMO weather code -> lucide icon (SVG renders reliably in the headless
// browser on the render server, unlike emoji)
const WEATHER_ICONS: Record<number, LucideIcon> = {
  0: Sun,
  1: SunDim,
  2: CloudSun,
  3: Cloud,
  45: CloudFog,
  48: CloudFog,
  51: CloudDrizzle,
  53: CloudDrizzle,
  55: CloudDrizzle,
  61: CloudRain,
  63: CloudRain,
  65: CloudRainWind,
  71: CloudSnow,
  73: CloudSnow,
  75: Snowflake,
  77: Snowflake,
  80: CloudSunRain,
  81: CloudRain,
  82: CloudRainWind,
  85: CloudSnow,
  86: CloudSnow,
  95: CloudLightning,
  96: CloudHail,
  99: CloudHail,
};

export const weatherIcon = (code: number) => WEATHER_ICONS[code] ?? Cloud;

export const weatherDescription = (code: number) =>
  WEATHER_CODES[code]?.description ?? 'Unknown';

// All times from the API are local-timezone strings ("2026-08-04T09:45"),
// so slicing beats Date parsing: it can't shift across timezones.
export const formatHour = (time: string) => time.slice(11, 16);

/** Hourly forecast from the current hour on, guarding against stale data. */
export function upcomingHours(count: number) {
  if (weather.error) return [];
  const currentHour = weather.current.time.slice(0, 13);
  return weather.hourly.filter((hour) => hour.time.slice(0, 13) >= currentHour).slice(0, count);
}

/** Daily forecast for a local date (YYYY-MM-DD), if within the forecast. */
export function dailyForecast(date: string) {
  if (weather.error) return undefined;
  return weather.daily.find((day) => day.date === date);
}
