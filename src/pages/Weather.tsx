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
  Wind,
  type LucideIcon,
} from 'lucide-react';
import weatherData from '../../data/weather.json';
import type { WeatherData } from '../types/weather';
import { WEATHER_CODES } from '../types/weather';

const data: WeatherData = weatherData;

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

export function Weather() {
  if (data.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold mb-2">Error loading weather data</h2>
          <p className="text-gray-600">{data.error}</p>
        </div>
      </div>
    );
  }

  const getDescription = (code: number) =>
    WEATHER_CODES[code]?.description ?? 'Unknown';
  const getIcon = (code: number) => WEATHER_ICONS[code] ?? Cloud;

  // All times from the API are local-timezone strings ("2026-08-04T09:45"),
  // so slicing beats Date parsing: it can't shift across timezones.
  const formatTime = (timeString: string) => timeString.slice(11, 16);

  const todayString = data.current.time.slice(0, 10);

  const formatDate = (dateString: string) => {
    const dayDiff =
      (Date.parse(dateString) - Date.parse(todayString)) / 86_400_000;

    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    return new Date(`${dateString}T12:00:00`).toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Guard against stale data: only show hours from the current hour on
  const upcomingHours = data.hourly
    .filter((hour) => hour.time.slice(0, 13) >= data.current.time.slice(0, 13))
    .slice(0, 6);

  const CurrentIcon = getIcon(data.current.weatherCode);

  return (
    <div className="h-full w-full px-6 py-4 flex flex-col">
      {/* Location and Title */}
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-2xl font-bold">Weather</h1>
        {data.location.name && (
          <p className="text-gray-600">{data.location.name}</p>
        )}
      </div>

      {/* Current Weather */}
      <div className="border-2 border-gray-300 rounded-lg px-5 py-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <CurrentIcon className="w-16 h-16" strokeWidth={1.5} />
          <div className="text-5xl font-bold">
            {Math.round(data.current.temperature)}°
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg text-gray-700">
            {getDescription(data.current.weatherCode)}
          </div>
          <div className="text-sm text-gray-500 flex items-center justify-end gap-1">
            <Wind className="w-4 h-4" />
            {Math.round(data.current.windSpeed)} km/h
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-2">Next Hours</h2>
        <div className="grid grid-cols-6 gap-2">
          {upcomingHours.map((hour) => {
            const HourIcon = getIcon(hour.weatherCode);
            return (
              <div
                key={hour.time}
                className="border border-gray-300 rounded p-2 text-center"
              >
                <div className="text-xs text-gray-600 mb-1">
                  {formatTime(hour.time)}
                </div>
                <HourIcon className="w-7 h-7 mx-auto mb-1" strokeWidth={1.5} />
                <div className="font-bold">{Math.round(hour.temperature)}°</div>
                <div className="text-xs text-gray-600">
                  {hour.precipitation > 0
                    ? `${hour.precipitation.toFixed(1)}mm`
                    : ' '}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Forecast */}
      <div className="flex-1 min-h-0">
        <h2 className="text-lg font-bold mb-2">Coming Days</h2>
        <div className="grid grid-cols-5 gap-2">
          {data.daily.slice(0, 5).map((day) => {
            const DayIcon = getIcon(day.weatherCode);
            return (
              <div
                key={day.date}
                className="border border-gray-300 rounded p-2 text-center"
              >
                <div className="text-sm font-semibold mb-1">
                  {formatDate(day.date)}
                </div>
                <DayIcon className="w-8 h-8 mx-auto mb-1" strokeWidth={1.5} />
                <div>
                  <span className="font-bold">
                    {Math.round(day.temperatureMax)}°
                  </span>
                  <span className="text-gray-600">
                    {' '}
                    / {Math.round(day.temperatureMin)}°
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {day.precipitationSum > 0
                    ? `${day.precipitationSum.toFixed(1)}mm`
                    : ' '}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
