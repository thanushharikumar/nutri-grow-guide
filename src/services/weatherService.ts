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

const DEFAULT_COORDINATES: Coordinates = {
  lat: 28.6139,
  lon: 77.2090
};

const DEFAULT_COORDINATES: Coordinates = {
  lat: 28.6139,
  lon: 77.2090
};

export const getUserLocation = (): Promise<Coordinates> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      resolve(DEFAULT_COORDINATES);
      return;
    }

    const successCallback = (position: GeolocationPosition) => {
      const coords: Coordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      console.log('✅ Location acquired:', coords);
      resolve(coords);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.error('❌ Geolocation error:', error.message);
      resolve(DEFAULT_COORDINATES);
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    console.log('🌍 Requesting location permission...');
    navigator.geolocation.getCurrentPosition(
      successCallback,
      errorCallback,
      options
    );
  });
};

export const getUserLocation = (): Promise<Coordinates> => {
  const getUserLocationPromise = new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case 1: message = 'Permission denied'; break;
          case 2: message = 'Position unavailable'; break;
          case 3: message = 'Timeout'; break;
        }
        reject(new Error(message));
      },
      options
    );
  });

  // Set a timeout of 5 seconds
  const timeoutPromise = new Promise<Coordinates>((_, reject) => {
    setTimeout(() => reject(new Error('Location request timed out')), 5000);
  });

  // Race between geolocation and timeout
  return Promise.race([
    getUserLocationPromise,
    timeoutPromise
  ]).catch(error => {
    console.warn('Falling back to default location:', error.message);
    return DEFAULT_COORDINATES;
  });
};

export const getWeatherData = async (coordinates?: Coordinates): Promise<WeatherData> => {
  try {
    // If no coordinates provided, try to get user location
    const userCoords = coordinates || await getUserLocation();

    const { data, error } = await supabase.functions.invoke('get-weather', {
      body: { lat: userCoords.lat, lon: userCoords.lon }
    });

    if (error) {
      console.error('Weather API error:', error);
      throw new Error(error.message || 'Unable to fetch weather information');
    }

    if (!data) {
      throw new Error('No weather data received');
    }

    return data as WeatherData;
  } catch (error) {
    console.error('Weather service error:', error);
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

    const getLocation = () => {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      console.log('🌍 Requesting browser location permission...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location permission granted:', position.coords.latitude, position.coords.longitude);
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('❌ Geolocation error:', error.code, error.message);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    };

    // Start location request
    getLocation();
    
    // Try to trigger the permission popup more aggressively
    const permissionRequest = async () => {
      try {
        // First try to query permissions
        const status = await navigator.permissions.query({ name: 'geolocation' });
        console.log('🔍 Geolocation permission status:', status.state);
        
        // If denied, we can't proceed
        if (status.state === 'denied') {
          throw new Error('Location permission was denied');
        }
      } catch (err) {
        console.log('Permission query not supported, trying direct geolocation');
      }

      // Proceed with geolocation request
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
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Execute the permission request
    permissionRequest();
    );
  });
};