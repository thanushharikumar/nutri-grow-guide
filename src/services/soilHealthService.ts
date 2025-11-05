import { supabase } from "@/integrations/supabase/client";
import { Coordinates } from './weatherService';
import { SoilGridsService } from './SoilGridsService';

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
    console.log('🌍 Fetching real soil data from SoilGrids for coordinates:', coordinates);
    
    // Try to fetch real data from SoilGrids API
    const soilGridsData = await SoilGridsService.getSoilData(coordinates.lat, coordinates.lon);
    console.log('✅ Real soil data fetched from SoilGrids:', soilGridsData);
    
    const soilData: SoilHealthData = {
      soilType: soilGridsData.soilType,
      pH: soilGridsData.pH,
      nitrogen: soilGridsData.nitrogen,
      phosphorus: soilGridsData.phosphorus,
      potassium: soilGridsData.potassium,
      organicCarbon: soilGridsData.organicCarbon,
      electricalConductivity: 0.5,
      micronutrients: {
        iron: 15,
        manganese: 8,
        zinc: 0.8,
        copper: 0.6
      },
      location: {
        latitude: coordinates.lat,
        longitude: coordinates.lon
      },
      lastUpdated: new Date()
    };

    console.log('✅ Retrieved soil health data:', soilData);
    return soilData;
  } catch (error) {
    console.error('⚠️ SoilGrids API failed, falling back to mock data:', error);
    
    // Fallback to mock data if SoilGrids fails
    const region = getRegionFromCoordinates(coordinates);
    console.log('📍 Using mock data for region:', region);
    
    const baseData = mockSoilData[region] || mockSoilData['North India'];
    
    const soilData: SoilHealthData = {
      ...baseData,
      location: {
        latitude: coordinates.lat,
        longitude: coordinates.lon
      },
      lastUpdated: new Date()
    };

    console.log('✅ Retrieved soil health data (mock):', soilData);
    return soilData;
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
  console.log('📄 Processing Soil Health Card:', file.name);

  try {
    // Convert image to base64
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 content
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });

    console.log('📤 Sending image to OCR service...');

    // Call the extract-soil-health-card edge function
    const { data, error } = await supabase.functions.invoke('extract-soil-health-card', {
      body: { image: base64Image }
    });

    if (error) {
      console.error('OCR service error:', error);
      throw new Error('Failed to process Soil Health Card. Please try again.');
    }

    if (!data.success) {
      console.error('OCR extraction failed:', data.error);
      throw new Error(data.error || 'Could not extract data from the Soil Health Card');
    }

    console.log('✅ OCR extraction successful:', data.extractedData);

    const extracted = data.extractedData;

    // Get user's current location for the soil data
    let latitude = 28.6139; // Default to Delhi
    let longitude = 77.2090;
    
    try {
      const coords = await import('./weatherService').then(m => m.getUserLocation());
      latitude = coords.lat;
      longitude = coords.lon;
    } catch {
      console.log('Using default coordinates');
    }

    // Build soil health data from extracted information
    const soilData: SoilHealthData = {
      soilType: (extracted.soilType as any) || 'loamy', // Default if not detected
      pH: extracted.pH || 6.5,
      nitrogen: extracted.nitrogen || 150,
      phosphorus: extracted.phosphorus || 25,
      potassium: extracted.potassium || 120,
      organicCarbon: extracted.organicCarbon || 1.2,
      electricalConductivity: 0.5, // This is rarely on SHC, use default
      micronutrients: {
        iron: 15,
        manganese: 8,
        zinc: 0.8,
        copper: 0.6
      },
      location: {
        latitude,
        longitude
      },
      lastUpdated: new Date()
    };

    // Warn if confidence is low
    if (extracted.confidence < 0.6) {
      console.warn('⚠️ Low confidence extraction:', extracted.confidence);
    }

    console.log('✅ Soil Health Card processed successfully:', soilData);
    return soilData;

  } catch (error: any) {
    console.error('❌ Error processing Soil Health Card:', error);
    throw new Error(error.message || 'Failed to process Soil Health Card');
  }
};
