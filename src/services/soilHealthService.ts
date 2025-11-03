import { supabase } from "@/integrations/supabase/client";
import { Coordinates } from './weatherService';

export interface SoilHealthData {
  soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
  pH: number;
  nitrogen: number; // ppm
  phosphorus: number; // ppm
  potassium: number; // ppm
  organicCarbon: number; // %
  electricalConductivity?: number; // dS/m
  micronutrients?: {
    iron: number; // ppm
    manganese: number; // ppm
    zinc: number; // ppm
    copper: number; // ppm
  };
  location: {
    latitude: number;
    longitude: number;
  };
  lastUpdated: Date;
}

// Import mock data from separate file
import { mockSoilData } from './mockData';

// Function to determine region based on coordinates
const getRegionFromCoordinates = (coordinates: Coordinates): string => {
  const { lat, lon } = coordinates;
  
  if (lat >= 25 && lat <= 35) return 'North India';
  if (lat >= 15 && lat <= 25 && lon >= 68 && lon <= 77) return 'West India';
  if (lat >= 8 && lat <= 20) return 'South India';
  if (lat >= 20 && lat <= 28 && lon >= 84 && lon <= 92) return 'East India';
  
  return 'North India'; // Default
};

export const getSoilHealthData = async (coordinates: Coordinates): Promise<SoilHealthData> => {
  console.log('🌍 Starting soil health data fetch...');
  
  if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lon !== 'number') {
    console.error('❌ Invalid coordinates:', coordinates);
    throw new Error('Invalid coordinates provided');
  }

  try {
    console.log('🌍 Fetching soil data for coordinates:', coordinates);
    
    // Get region and mock data since Supabase is not running locally
    const region = getRegionFromCoordinates(coordinates);
    console.log('📍 Determined region:', region);
    
    const baseData = mockSoilData[region]; // Use mockSoilData here
    if (!baseData) {
      console.error('❌ No data found for region:', region);
      throw new Error('No soil data available for this region');
    }
    
    // Return mock data with location and timestamp
    const soilData: SoilHealthData = {
      ...baseData,
      location: {
        latitude: coordinates.lat,
        longitude: coordinates.lon
      },
      lastUpdated: new Date()
    };

    console.log('✅ Retrieved soil health data:', soilData);
    return soilData;
  } catch (error) {
    console.error('❌ Error getting soil health data:', error);
    throw error;
  }
};

export const validateSoilHealthCard = async (cardNumber: string): Promise<boolean> => {
  return cardNumber.startsWith('SHC-') && cardNumber.length >= 10;
};

export const searchNearbyFarms = async (coordinates: Coordinates, radius: number = 5): Promise<SoilHealthData[]> => {
  const region = getRegionFromCoordinates(coordinates);
  const baseData = mockSoilData[region] || mockSoilData['North India'];
  
  const nearbyFarms: SoilHealthData[] = [];
  const farmCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < farmCount; i++) {
    const variation = 0.15;
    nearbyFarms.push({
      ...baseData,
      nitrogen: Math.round(baseData.nitrogen * (1 + (Math.random() - 0.5) * variation)),
      phosphorus: Math.round(baseData.phosphorus * (1 + (Math.random() - 0.5) * variation)),
      potassium: Math.round(baseData.potassium * (1 + (Math.random() - 0.5) * variation)),
      pH: Math.round((baseData.pH + (Math.random() - 0.5) * 0.6) * 10) / 10,
      location: {
        latitude: coordinates.lat + (Math.random() - 0.5) * 0.1,
        longitude: coordinates.lon + (Math.random() - 0.5) * 0.1
      },
      lastUpdated: new Date()
    });
  }
  
  return nearbyFarms;
};

export const uploadSoilHealthCard = async (file: File): Promise<SoilHealthData> => {
  console.log('📄 Simulating SHC upload and processing for file:', file.name);

  // In a real application, this would involve:
  // 1. Uploading the file to a storage service (e.g., Supabase Storage)
  // 2. Calling an AI/ML service (e.g., a Supabase Edge Function) to perform OCR
  //    and extract soil data from the image.
  // 3. Validating the extracted data.

  // For now, we'll simulate a delay and return mock data.
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

  // Return a fixed mock soil data for demonstration purposes
  const mockUploadedSoilData: SoilHealthData = {
    soilType: 'loamy',
    pH: 6.8,
    nitrogen: 220,
    phosphorus: 35,
    potassium: 180,
    organicCarbon: 1.5,
    electricalConductivity: 0.5,
    micronutrients: { iron: 18, manganese: 9, zinc: 1.0, copper: 0.7 },
    location: {
      latitude: 28.6139, // Default to New Delhi for mock
      longitude: 77.2090
    },
    lastUpdated: new Date()
  };

  console.log('✅ Simulated SHC processing complete, returning mock data:', mockUploadedSoilData);
  return mockUploadedSoilData;
};
