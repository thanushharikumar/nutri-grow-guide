// Recommendation Engine - Types and Interfaces
export interface SoilData {
  soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicCarbon: number;
}

export interface FertilizerRecommendation {
  type: string;
  amount: number;
  unit: string;
  timing: string;
  applicationMethod: string;
}

export interface ProductRecommendation {
  name: string;
  type: string;
  quantity: number;
  applicationTiming: string;
  method: string;
}

export interface ApplicationSchedule {
  stage: string;
  daysAfterPlanting: number;
  fertilizers: string[];
  quantity: string;
  method: string;
}

export interface RecommendationResult {
  fertilizer: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  fertilizers: FertilizerRecommendation[];
  sustainabilityScore: number;
  recommendations: string[];
  warnings?: string[];
  costEstimate?: number;
  estimatedCost?: number;
  expectedYieldIncrease?: number;
  products: ProductRecommendation[];
  applicationSchedule: ApplicationSchedule[];
  weatherConsiderations: string[];
}

export const generateRecommendation = async (
  soilData: SoilData,
  cropType: string,
  weatherData?: any,
  cropAnalysis?: any
): Promise<RecommendationResult> => {
  // This function is now handled by the edge function
  // This is kept for type compatibility
  throw new Error('Use the edge function API directly');
};
