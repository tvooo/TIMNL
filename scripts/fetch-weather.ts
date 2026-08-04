import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current_weather: {
    time: string;
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weathercode: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weathercode: number[];
  };
}

interface WeatherData {
  fetchedAt: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  current: {
    time: string;
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    precipitation: number;
    weatherCode: number;
  }>;
  daily: Array<{
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitationSum: number;
    weatherCode: number;
  }>;
  error?: string;
}

async function fetchWeather() {
  try {
    const latitude = process.env.WEATHER_LATITUDE;
    const longitude = process.env.WEATHER_LONGITUDE;
    const locationName = process.env.WEATHER_LOCATION_NAME;

    if (!latitude || !longitude) {
      throw new Error('Missing weather location in .env file (WEATHER_LATITUDE, WEATHER_LONGITUDE)');
    }

    console.log('Fetching weather data from Open-Meteo...');
    console.log(`Location: ${locationName || 'Unknown'} (${latitude}, ${longitude})`);

    // Build API URL with KNMI model for Netherlands
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('hourly', 'temperature_2m,precipitation,weathercode');
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode');
    url.searchParams.set('timezone', 'Europe/Amsterdam');
    url.searchParams.set('forecast_days', '7');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Open-Meteo API returned ${response.status}: ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    // Get next 12 hours of hourly data
    const now = new Date();
    const hourlyData = data.hourly.time.slice(0, 12).map((time, index) => ({
      time,
      temperature: data.hourly.temperature_2m[index],
      precipitation: data.hourly.precipitation[index],
      weatherCode: data.hourly.weathercode[index],
    }));

    // Get next 7 days of daily data
    const dailyData = data.daily.time.map((date, index) => ({
      date,
      temperatureMax: data.daily.temperature_2m_max[index],
      temperatureMin: data.daily.temperature_2m_min[index],
      precipitationSum: data.daily.precipitation_sum[index],
      weatherCode: data.daily.weathercode[index],
    }));

    const output: WeatherData = {
      fetchedAt: new Date().toISOString(),
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        name: locationName,
      },
      current: {
        time: data.current_weather.time,
        temperature: data.current_weather.temperature,
        weatherCode: data.current_weather.weathercode,
        windSpeed: data.current_weather.windspeed,
        windDirection: data.current_weather.winddirection,
      },
      hourly: hourlyData,
      daily: dailyData,
    };

    const outputPath = path.join(process.cwd(), 'data/weather.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n✓ Current: ${output.current.temperature}°C`);
    console.log(`✓ Fetched ${hourlyData.length} hourly forecasts`);
    console.log(`✓ Fetched ${dailyData.length} daily forecasts`);
    console.log(`\nData saved to ${outputPath}`);
  } catch (error) {
    console.error('Error fetching weather data:', (error as Error).message);

    const errorOutput: WeatherData = {
      fetchedAt: new Date().toISOString(),
      location: {
        latitude: 0,
        longitude: 0,
      },
      current: {
        time: new Date().toISOString(),
        temperature: 0,
        weatherCode: 0,
        windSpeed: 0,
        windDirection: 0,
      },
      hourly: [],
      daily: [],
      error: (error as Error).message,
    };

    const outputPath = path.join(process.cwd(), 'data/weather.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(errorOutput, null, 2));

    process.exit(1);
  }
}

fetchWeather();
