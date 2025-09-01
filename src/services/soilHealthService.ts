import { Coordinates } from './weatherService';

export interface SoilHealthData {
  soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
  pH: number;
  nitrogen: number; // ppm
  phosphorus: number; // ppm
  potassium: number; // ppm
  organicCarbon: number; // %
  electricalConductivity: number; // dS/m
  sulfur: number; // ppm
  zinc: number; // ppm
  boron: number; // ppm
  iron: number; // ppm
  manganese: number; // ppm
  copper: number; // ppm
  location: string;
  cardNumber?: string;
  lastUpdated: Date;
}

// Mock soil health card database - In production, this would be an API call
const mockSoilHealthDatabase: Record<string, SoilHealthData> = {
  // North India - Punjab/Haryana region
  'north_plains': {
    soilType: 'loamy',
    pH: 7.2,
    nitrogen: 165,
    phosphorus: 28,
    potassium: 135,
    organicCarbon: 0.8,
    electricalConductivity: 0.3,
    sulfur: 12,
    zinc: 0.8,
    boron: 0.5,
    iron: 8.5,
    manganese: 3.2,
    copper: 1.1,
    location: 'North Plains',
    cardNumber: 'SHC-NP-2024-001',
    lastUpdated: new Date('2024-01-15')
  },
  // South India - Tamil Nadu/Karnataka
  'south_plains': {
    soilType: 'clayey',
    pH: 6.8,
    nitrogen: 145,
    phosphorus: 22,
    potassium: 115,
    organicCarbon: 1.2,
    electricalConductivity: 0.4,
    sulfur: 15,
    zinc: 0.6,
    boron: 0.4,
    iron: 12.3,
    manganese: 4.5,
    copper: 0.9,
    location: 'South Plains',
    cardNumber: 'SHC-SP-2024-002',
    lastUpdated: new Date('2024-02-10')
  },
  // Western India - Maharashtra/Gujarat
  'west_plains': {
    soilType: 'silty',
    pH: 7.8,
    nitrogen: 125,
    phosphorus: 18,
    potassium: 98,
    organicCarbon: 0.9,
    electricalConductivity: 0.5,
    sulfur: 10,
    zinc: 0.4,
    boron: 0.3,
    iron: 6.8,
    manganese: 2.8,
    copper: 0.7,
    location: 'West Plains',
    cardNumber: 'SHC-WP-2024-003',
    lastUpdated: new Date('2024-01-28')
  },
  // Eastern India - West Bengal/Bihar
  'east_plains': {
    soilType: 'clayey',
    pH: 6.2,
    nitrogen: 180,
    phosphorus: 35,
    potassium: 158,
    organicCarbon: 1.8,
    electricalConductivity: 0.2,
    sulfur: 18,
    zinc: 1.2,
    boron: 0.6,
    iron: 15.2,
    manganese: 6.1,
    copper: 1.4,
    location: 'East Plains',
    cardNumber: 'SHC-EP-2024-004',
    lastUpdated: new Date('2024-02-05')
  },
  // Coastal regions
  'coastal': {
    soilType: 'sandy',
    pH: 8.1,
    nitrogen: 95,
    phosphorus: 15,
    potassium: 78,
    organicCarbon: 0.6,
    electricalConductivity: 0.8,
    sulfur: 8,
    zinc: 0.3,
    boron: 0.2,
    iron: 4.5,
    manganese: 1.8,
    copper: 0.5,
    location: 'Coastal Region',
    cardNumber: 'SHC-CR-2024-005',
    lastUpdated: new Date('2024-01-20')
  },
  // Hill regions
  'hills': {
    soilType: 'loamy',
    pH: 5.8,
    nitrogen: 210,
    phosphorus: 42,
    potassium: 185,
    organicCarbon: 2.5,
    electricalConductivity: 0.1,
    sulfur: 22,
    zinc: 1.8,
    boron: 0.8,
    iron: 18.5,
    manganese: 8.2,
    copper: 1.9,
    location: 'Hill Region',
    cardNumber: 'SHC-HR-2024-006',
    lastUpdated: new Date('2024-02-12')
  }
};

// Function to determine region based on coordinates
const getRegionFromCoordinates = (coordinates: Coordinates): string => {
  const { lat, lon } = coordinates;
  
  // Indian subcontinent coordinate ranges
  if (lat >= 28 && lat <= 32 && lon >= 74 && lon <= 78) {
    return 'north_plains'; // Punjab, Haryana, North Rajasthan
  } else if (lat >= 8 && lat <= 15 && lon >= 76 && lon <= 80) {
    return 'south_plains'; // Tamil Nadu, Karnataka, Andhra Pradesh
  } else if (lat >= 15 && lat <= 25 && lon >= 72 && lon <= 78) {
    return 'west_plains'; // Maharashtra, Gujarat, Madhya Pradesh
  } else if (lat >= 22 && lat <= 28 && lon >= 84 && lon <= 90) {
    return 'east_plains'; // West Bengal, Bihar, Jharkhand
  } else if ((lat >= 8 && lat <= 20 && lon >= 68 && lon <= 76) || 
             (lat >= 8 && lat <= 20 && lon >= 80 && lon <= 88)) {
    return 'coastal'; // Coastal regions
  } else if (lat >= 25 && lat <= 35 && lon >= 75 && lon <= 85) {
    return 'hills'; // Himalayan foothills, hill stations
  }
  
  // Default to most common soil type for India
  return 'north_plains';
};

export const getSoilHealthData = async (coordinates: Coordinates): Promise<SoilHealthData> => {
  try {
    // In production, this would make an API call to:
    // - Government soil health card database
    // - Agricultural department APIs
    // - Remote sensing soil data services
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const region = getRegionFromCoordinates(coordinates);
    const baseData = mockSoilHealthDatabase[region];
    
    // Add some realistic variation to the data
    const variation = {
      pH: (Math.random() - 0.5) * 0.4, // ±0.2 pH units
      nitrogen: (Math.random() - 0.5) * 30, // ±15 ppm
      phosphorus: (Math.random() - 0.5) * 10, // ±5 ppm
      potassium: (Math.random() - 0.5) * 40, // ±20 ppm
      organicCarbon: (Math.random() - 0.5) * 0.4, // ±0.2%
    };
    
    const soilData: SoilHealthData = {
      ...baseData,
      pH: Math.round((baseData.pH + variation.pH) * 10) / 10,
      nitrogen: Math.max(0, Math.round(baseData.nitrogen + variation.nitrogen)),
      phosphorus: Math.max(0, Math.round(baseData.phosphorus + variation.phosphorus)),
      potassium: Math.max(0, Math.round(baseData.potassium + variation.potassium)),
      organicCarbon: Math.max(0.1, Math.round((baseData.organicCarbon + variation.organicCarbon) * 10) / 10),
      location: `${baseData.location} (${coordinates.lat.toFixed(2)}°N, ${coordinates.lon.toFixed(2)}°E)`,
    };
    
    return soilData;
  } catch (error) {
    console.error('Error fetching soil health data:', error);
    throw new Error('Unable to fetch soil health card data for your location');
  }
};

export const validateSoilHealthCard = (cardNumber: string): Promise<boolean> => {
  // Mock validation - in production, verify against government database
  return Promise.resolve(cardNumber.startsWith('SHC-') && cardNumber.length >= 10);
};

export const searchNearbyFarms = async (coordinates: Coordinates, radius: number = 5): Promise<SoilHealthData[]> => {
  // Mock function to find nearby farms with soil data
  // In production, this would query a geospatial database
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const region = getRegionFromCoordinates(coordinates);
  const baseData = mockSoilHealthDatabase[region];
  
  // Generate 3-5 nearby farm data points
  const nearbyFarms: SoilHealthData[] = [];
  const farmCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < farmCount; i++) {
    const variation = {
      pH: (Math.random() - 0.5) * 1.0,
      nitrogen: (Math.random() - 0.5) * 60,
      phosphorus: (Math.random() - 0.5) * 20,
      potassium: (Math.random() - 0.5) * 80,
      organicCarbon: (Math.random() - 0.5) * 0.8,
    };
    
    nearbyFarms.push({
      ...baseData,
      pH: Math.round((baseData.pH + variation.pH) * 10) / 10,
      nitrogen: Math.max(0, Math.round(baseData.nitrogen + variation.nitrogen)),
      phosphorus: Math.max(0, Math.round(baseData.phosphorus + variation.phosphorus)),
      potassium: Math.max(0, Math.round(baseData.potassium + variation.potassium)),
      organicCarbon: Math.max(0.1, Math.round((baseData.organicCarbon + variation.organicCarbon) * 10) / 10),
      location: `Farm ${i + 1} - ${(Math.random() * radius).toFixed(1)}km away`,
      cardNumber: `SHC-${region.toUpperCase()}-2024-${String(100 + i).padStart(3, '0')}`,
    });
  }
  
  return nearbyFarms;
};