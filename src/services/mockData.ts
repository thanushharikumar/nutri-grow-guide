import { SoilHealthData } from './soilHealthService';

export const mockSoilData: Record<string, SoilHealthData> = {
  'North India': {
    soilType: 'loamy',
    pH: 7.2,
    nitrogen: 280,
    phosphorus: 45,
    potassium: 180,
    organicCarbon: 1.8,
    electricalConductivity: 0.3,
    micronutrients: {
      iron: 15,
      manganese: 8,
      zinc: 1.5,
      copper: 0.8
    },
    location: {
      latitude: 28.6139,
      longitude: 77.2090
    },
    lastUpdated: new Date(),
    dataSource: 'mock-regional'
  }
};