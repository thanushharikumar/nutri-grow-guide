import { supabase } from "@/integrations/supabase/client";

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  description: string;
  location: string;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

const DEFAULT_COORDS: Coordinates = {
  lat: 28.6139,
  lon: 77.2090
};

export function getUserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ Location detected:", position.coords);
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.error("❌ Location error:", error.message);
        reject(new Error("Location permission denied or unavailable."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

  });
}

export async function getWeatherData(coordinates?: Coordinates): Promise<WeatherData> {
  try {
    const coords = coordinates || await getUserLocation();
    console.log('Using coordinates:', coords);

    const { data, error } = await supabase.functions.invoke('get-weather', {
      body: { lat: coords.lat, lon: coords.lon }
    });

    if (error) throw error;
    if (!data) throw new Error('No weather data received');

    return data as WeatherData;
  } catch (error) {
    console.error('Weather service error:', error);
    throw new Error('Unable to fetch weather information');
  }
}