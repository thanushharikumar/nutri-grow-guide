import axios from 'axios';

// For demo purposes, using a mock weather service
// In production, you'd use OpenWeatherMap API with a real API key
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
    // Mock weather data for demo
    // In production, you'd make an actual API call:
    // const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    
    const mockData: WeatherData = {
      temperature: Math.round(20 + Math.random() * 15), // 20-35°C
      humidity: Math.round(40 + Math.random() * 40), // 40-80%
      rainfall: Math.round(Math.random() * 10), // 0-10mm
      windSpeed: Math.round(Math.random() * 15), // 0-15 km/h
      description: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
      location: coordinates ? 'Your Location' : 'Default Location'
    };
    
    return mockData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Unable to fetch weather information');
  }
};

export const getUserLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
};