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

export const getWeatherData = async (coordinates?: Coordinates): Promise<WeatherData> => {
  try {
    if (!coordinates) {
      // Try to get user's location first
      const userCoords = await getUserLocation();
      coordinates = userCoords;
    }

    // Call Supabase edge function for weather data
    const { data, error } = await supabase.functions.invoke('get-weather', {
      body: { 
        lat: coordinates.lat, 
        lon: coordinates.lon 
      }
    });

    if (error) {
      console.error('Error calling weather function:', error);
      throw new Error(error.message || 'Unable to fetch weather information');
    }

    if (!data) {
      throw new Error('No weather data received');
    }

    return data as WeatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Unable to fetch weather information');
  }
};

export const getUserLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation is not supported by this browser');
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    console.log('🌍 Requesting browser location permission...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Location permission granted:', position.coords.latitude, position.coords.longitude);
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.error('❌ Geolocation error:', error.code, error.message);
        if (error.code === 1) {
          console.error('User denied location permission');
        } else if (error.code === 2) {
          console.error('Location position unavailable');
        } else if (error.code === 3) {
          console.error('Location request timeout');
        }
        reject(error);
      },
      {
        enableHighAccuracy: true, // Request high accuracy to ensure permission prompt
        timeout: 15000, // Increase timeout
        maximumAge: 0 // Don't use cached position - always request fresh
      }
    );
  });
};