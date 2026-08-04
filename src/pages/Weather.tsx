import weatherData from '../../data/weather.json';
import type { WeatherData } from '../types/weather';
import { WEATHER_CODES } from '../types/weather';

const data: WeatherData = weatherData;

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

  const getWeatherInfo = (code: number) => {
    return WEATHER_CODES[code] || { description: 'Unknown', icon: '?' };
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  const currentWeather = getWeatherInfo(data.current.weatherCode);

  return (
    <div className="h-full w-full p-8 flex flex-col">
      {/* Location and Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Weather</h1>
        {data.location.name && (
          <p className="text-gray-600 text-lg">{data.location.name}</p>
        )}
      </div>

      {/* Current Weather - Large Display */}
      <div className="border-2 border-gray-300 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-6xl font-bold mb-2">
              {Math.round(data.current.temperature)}°
            </div>
            <div className="text-xl text-gray-700 mb-1">
              {currentWeather.description}
            </div>
            <div className="text-sm text-gray-500">
              Wind: {Math.round(data.current.windSpeed)} km/h
            </div>
          </div>
          <div className="text-7xl">
            {currentWeather.icon}
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Next Hours</h2>
        <div className="grid grid-cols-6 gap-2">
          {data.hourly.slice(0, 6).map((hour, index) => {
            const weatherInfo = getWeatherInfo(hour.weatherCode);
            return (
              <div key={index} className="border border-gray-300 rounded p-2 text-center">
                <div className="text-xs text-gray-600 mb-1">
                  {formatTime(hour.time)}
                </div>
                <div className="text-2xl mb-1">
                  {weatherInfo.icon}
                </div>
                <div className="font-bold">
                  {Math.round(hour.temperature)}°
                </div>
                {hour.precipitation > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    {hour.precipitation.toFixed(1)}mm
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Forecast */}
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-3">Coming Days</h2>
        <div className="space-y-2">
          {data.daily.slice(0, 5).map((day, index) => {
            const weatherInfo = getWeatherInfo(day.weatherCode);
            return (
              <div key={index} className="border border-gray-300 rounded p-3 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-3xl">
                    {weatherInfo.icon}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {formatDate(day.date)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {weatherInfo.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {Math.round(day.temperatureMax)}°
                    </div>
                    <div className="text-sm text-gray-600">
                      {Math.round(day.temperatureMin)}°
                    </div>
                  </div>
                  {day.precipitationSum > 0 && (
                    <div className="text-sm text-gray-600 w-12 text-right">
                      {day.precipitationSum.toFixed(1)}mm
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
