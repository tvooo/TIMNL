export interface CurrentWeather {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitation: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  weatherCode: number;
}

export interface WeatherData {
  fetchedAt: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  error?: string;
}

// WMO Weather interpretation codes. Icons live in the Weather page as
// lucide components — emoji glyphs don't render in the headless browser
// on the render server.
export const WEATHER_CODES: Record<number, { description: string }> = {
  0: { description: 'Clear sky' },
  1: { description: 'Mainly clear' },
  2: { description: 'Partly cloudy' },
  3: { description: 'Overcast' },
  45: { description: 'Foggy' },
  48: { description: 'Depositing rime fog' },
  51: { description: 'Light drizzle' },
  53: { description: 'Moderate drizzle' },
  55: { description: 'Dense drizzle' },
  61: { description: 'Slight rain' },
  63: { description: 'Moderate rain' },
  65: { description: 'Heavy rain' },
  71: { description: 'Slight snow' },
  73: { description: 'Moderate snow' },
  75: { description: 'Heavy snow' },
  77: { description: 'Snow grains' },
  80: { description: 'Slight rain showers' },
  81: { description: 'Moderate rain showers' },
  82: { description: 'Violent rain showers' },
  85: { description: 'Slight snow showers' },
  86: { description: 'Heavy snow showers' },
  95: { description: 'Thunderstorm' },
  96: { description: 'Thunderstorm with slight hail' },
  99: { description: 'Thunderstorm with heavy hail' },
};
