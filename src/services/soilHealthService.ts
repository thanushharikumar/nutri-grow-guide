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

// Mock soil health database for different regions
const mockSoilHealthDatabase: Record<string, Omit<SoilHealthData, 'location' | 'lastUpdated'>> = {
  'North India': {
    soilType: 'loamy',
    pH: 7.2,
    nitrogen: 280,
    phosphorus: 45,
    potassium: 180,
    organicCarbon: 1.8,
    electricalConductivity: 0.3,
    micronutrients: { iron: 15, manganese: 8, zinc: 1.5, copper: 0.8 }
  },
  'West India': {
    soilType: 'clayey',
    pH: 6.8,
    nitrogen: 320,
    phosphorus: 38,
    potassium: 160,
    organicCarbon: 1.2,
    electricalConductivity: 0.4,
    micronutrients: { iron: 12, manganese: 6, zinc: 1.2, copper: 0.6 }
  },
  'South India': {
    soilType: 'sandy',
    pH: 6.5,
    nitrogen: 180,
    phosphorus: 28,
    potassium: 120,
    organicCarbon: 0.8,
    electricalConductivity: 0.2,
    micronutrients: { iron: 18, manganese: 10, zinc: 1.8, copper: 1.0 }
  },
  'East India': {
    soilType: 'silty',
    pH: 7.0,
    nitrogen: 250,
    phosphorus: 42,
    potassium: 200,
    organicCarbon: 1.5,
    electricalConductivity: 0.2,
    micronutrients: { iron: 20, manganese: 12, zinc: 2.0, copper: 1.2 }
  }
};

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
  try {
    // First try to get soil health data from database
    const { data: soilData, error } = await supabase
      .from('soil_health')
      .select('*')
      .gte('latitude', coordinates.lat - 0.1)
      .lte('latitude', coordinates.lat + 0.1)
      .gte('longitude', coordinates.lon - 0.1)
      .lte('longitude', coordinates.lon + 0.1)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (soilData && !error) {
      return {
        soilType: soilData.soil_type as 'sandy' | 'loamy' | 'clayey' | 'silty',
        nitrogen: Number(soilData.nitrogen),
        phosphorus: Number(soilData.phosphorus),
        potassium: Number(soilData.potassium),
        pH: Number(soilData.ph),
        organicCarbon: Number(soilData.organic_carbon),
        electricalConductivity: soilData.electrical_conductivity ? Number(soilData.electrical_conductivity) : undefined,
        micronutrients: {
          iron: 15 + Math.random() * 10,
          manganese: 8 + Math.random() * 5,
          zinc: 1.5 + Math.random() * 1,
          copper: 0.8 + Math.random() * 0.4
        },
        location: {
          latitude: coordinates.lat,
          longitude: coordinates.lon
        },
        lastUpdated: new Date(soilData.last_updated)
      };
    }

    // If no data found, generate mock data based on region and store it
    const region = getRegionFromCoordinates(coordinates);
    const baseData = mockSoilHealthDatabase[region] || mockSoilHealthDatabase['North India'];
    
    // Add some realistic variations
    const variationFactor = 0.1;
    const mockData: SoilHealthData = {
      ...baseData,
      nitrogen: Math.round(baseData.nitrogen * (1 + (Math.random() - 0.5) * variationFactor)),
      phosphorus: Math.round(baseData.phosphorus * (1 + (Math.random() - 0.5) * variationFactor)),
      potassium: Math.round(baseData.potassium * (1 + (Math.random() - 0.5) * variationFactor)),
      pH: Math.round((baseData.pH + (Math.random() - 0.5) * 0.4) * 10) / 10,
      location: {
        latitude: coordinates.lat,
        longitude: coordinates.lon
      },
      lastUpdated: new Date()
    };

    // Store the generated data for future use
    const { error: insertError } = await supabase
      .from('soil_health')
      .insert({
        latitude: coordinates.lat,
        longitude: coordinates.lon,
        soil_type: mockData.soilType,
        ph: mockData.pH,
        nitrogen: mockData.nitrogen,
        phosphorus: mockData.phosphorus,
        potassium: mockData.potassium,
        organic_carbon: mockData.organicCarbon,
        electrical_conductivity: mockData.electricalConductivity,
        region: region
      });

    if (insertError) {
      console.error('Error storing soil health data:', insertError);
    }

    return mockData;
  } catch (error) {
    console.error('Error fetching soil health data:', error);
    throw new Error('Unable to fetch soil health information');
  }
};

export const validateSoilHealthCard = async (cardNumber: string): Promise<boolean> => {
  return cardNumber.startsWith('SHC-') && cardNumber.length >= 10;
};

export const searchNearbyFarms = async (coordinates: Coordinates, radius: number = 5): Promise<SoilHealthData[]> => {
  const region = getRegionFromCoordinates(coordinates);
  const baseData = mockSoilHealthDatabase[region] || mockSoilHealthDatabase['North India'];
  
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