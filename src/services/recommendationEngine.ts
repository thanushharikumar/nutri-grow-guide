import { WeatherData } from './weatherService';
import { CropAnalysisResult } from './cropAnalysisService';

export interface SoilData {
  soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
  pH: number;
  nitrogen: number; // ppm
  phosphorus: number; // ppm
  potassium: number; // ppm
  organicCarbon: number; // %
}

export interface FertilizerRecommendation {
  nitrogen: number; // kg/ha
  phosphorus: number; // kg/ha (P2O5)
  potassium: number; // kg/ha (K2O)
}

export interface ProductRecommendation {
  name: string;
  type: 'urea' | 'dap' | 'mop' | 'complex' | 'organic';
  quantity: number; // kg/ha
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
  fertilizer: FertilizerRecommendation;
  products: ProductRecommendation[];
  sustainabilityScore: number;
  applicationSchedule: ApplicationSchedule[];
  weatherConsiderations: string[];
  expectedYieldIncrease: number; // percentage
  costEstimate: number; // USD per hectare
}

export const generateRecommendation = (
  cropType: string,
  soilData: SoilData,
  weatherData: WeatherData,
  cropAnalysis?: CropAnalysisResult
): RecommendationResult => {
  
  // Base fertilizer requirements by crop type
  const cropRequirements: Record<string, FertilizerRecommendation> = {
    rice: { nitrogen: 120, phosphorus: 60, potassium: 40 },
    wheat: { nitrogen: 150, phosphorus: 80, potassium: 60 },
    maize: { nitrogen: 180, phosphorus: 90, potassium: 70 },
    millets: { nitrogen: 60, phosphorus: 40, potassium: 30 }
  };
  
  let baseRecommendation = cropRequirements[cropType.toLowerCase()] || cropRequirements.rice;
  
  // Adjust based on soil analysis
  const pHAdjustment = soilData.pH < 6.0 ? 1.1 : soilData.pH > 8.0 ? 0.9 : 1.0;
  const soilTypeAdjustment = {
    sandy: { n: 1.2, p: 1.1, k: 1.3 }, // Sandy soils need more nutrients
    loamy: { n: 1.0, p: 1.0, k: 1.0 }, // Ideal soil
    clayey: { n: 0.9, p: 1.2, k: 0.8 }, // Clay retains nutrients
    silty: { n: 1.0, p: 1.0, k: 1.1 }
  };
  
  const adjustment = soilTypeAdjustment[soilData.soilType];
  
  // Adjust for existing soil nutrients
  const nitrogenAdjustment = Math.max(0.3, 1 - (soilData.nitrogen / 300));
  const phosphorusAdjustment = Math.max(0.3, 1 - (soilData.phosphorus / 50));
  const potassiumAdjustment = Math.max(0.3, 1 - (soilData.potassium / 200));
  
  // Weather adjustments
  const rainfallAdjustment = weatherData.rainfall > 5 ? 1.1 : 0.95; // More rain = more leaching
  const temperatureAdjustment = weatherData.temperature > 30 ? 1.05 : 1.0;
  
  // Crop analysis adjustments
  let cropHealthAdjustment = 1.0;
  if (cropAnalysis) {
    switch (cropAnalysis.cropHealth) {
      case 'poor': cropHealthAdjustment = 1.3; break;
      case 'fair': cropHealthAdjustment = 1.15; break;
      case 'good': cropHealthAdjustment = 1.0; break;
      case 'excellent': cropHealthAdjustment = 0.9; break;
    }
  }
  
  // Calculate final recommendation
  const finalRecommendation: FertilizerRecommendation = {
    nitrogen: Math.round(baseRecommendation.nitrogen * 
              pHAdjustment * adjustment.n * nitrogenAdjustment * 
              rainfallAdjustment * temperatureAdjustment * cropHealthAdjustment),
    phosphorus: Math.round(baseRecommendation.phosphorus * 
                pHAdjustment * adjustment.p * phosphorusAdjustment * temperatureAdjustment),
    potassium: Math.round(baseRecommendation.potassium * 
               pHAdjustment * adjustment.k * potassiumAdjustment * temperatureAdjustment)
  };
  
  // Generate product recommendations
  const products: ProductRecommendation[] = [
    {
      name: "Urea (46% N)",
      type: "urea",
      quantity: Math.round(finalRecommendation.nitrogen / 0.46),
      applicationTiming: "Split application - 50% at planting, 30% at tillering, 20% at flowering",
      method: "Broadcasting and incorporation"
    },
    {
      name: "DAP (18-46-0)",
      type: "dap",
      quantity: Math.round(finalRecommendation.phosphorus / 0.46),
      applicationTiming: "Full dose at planting",
      method: "Band placement near seed"
    },
    {
      name: "Muriate of Potash (60% K2O)",
      type: "mop",
      quantity: Math.round(finalRecommendation.potassium / 0.6),
      applicationTiming: "50% at planting, 50% at flowering",
      method: "Broadcasting and incorporation"
    }
  ];
  
  // If organic carbon is low, add organic fertilizer
  if (soilData.organicCarbon < 1.0) {
    products.push({
      name: "Compost/FYM",
      type: "organic",
      quantity: 2500,
      applicationTiming: "2-3 weeks before planting",
      method: "Broadcasting and deep incorporation"
    });
  }
  
  // Generate application schedule
  const applicationSchedule: ApplicationSchedule[] = [
    {
      stage: "Land Preparation",
      daysAfterPlanting: -14,
      fertilizers: soilData.organicCarbon < 1.0 ? ["Compost/FYM", "Full P2O5", "50% K2O"] : ["Full P2O5", "50% K2O"],
      quantity: "As recommended",
      method: "Broadcasting and incorporation"
    },
    {
      stage: "Planting",
      daysAfterPlanting: 0,
      fertilizers: ["50% Nitrogen"],
      quantity: `${Math.round(finalRecommendation.nitrogen * 0.5)} kg N/ha`,
      method: "Band placement or starter fertilizer"
    },
    {
      stage: "Vegetative Growth",
      daysAfterPlanting: 30,
      fertilizers: ["30% Nitrogen"],
      quantity: `${Math.round(finalRecommendation.nitrogen * 0.3)} kg N/ha`,
      method: "Side dressing or foliar application"
    },
    {
      stage: "Reproductive Phase",
      daysAfterPlanting: 60,
      fertilizers: ["20% Nitrogen", "50% K2O"],
      quantity: `${Math.round(finalRecommendation.nitrogen * 0.2)} kg N/ha + ${Math.round(finalRecommendation.potassium * 0.5)} kg K2O/ha`,
      method: "Foliar spray or fertigation"
    }
  ];
  
  // Weather considerations
  const weatherConsiderations: string[] = [];
  if (weatherData.rainfall > 8) {
    weatherConsiderations.push("High rainfall expected - consider split applications to reduce nutrient loss");
  }
  if (weatherData.temperature > 32) {
    weatherConsiderations.push("High temperature - apply fertilizers early morning or late evening");
  }
  if (weatherData.humidity > 80) {
    weatherConsiderations.push("High humidity - ensure good ventilation for foliar applications");
  }
  if (weatherData.windSpeed > 10) {
    weatherConsiderations.push("High wind speed - avoid foliar applications");
  }
  
  // Calculate sustainability score (0-100)
  let sustainabilityScore = 60; // Base score
  
  // Organic matter bonus
  if (soilData.organicCarbon > 1.5) sustainabilityScore += 15;
  else if (soilData.organicCarbon > 1.0) sustainabilityScore += 10;
  
  // Precision application bonus
  sustainabilityScore += 10; // For using soil testing
  
  // Weather-responsive farming bonus
  sustainabilityScore += 10;
  
  // Reduce for high fertilizer use
  const totalNutrients = finalRecommendation.nitrogen + finalRecommendation.phosphorus + finalRecommendation.potassium;
  if (totalNutrients > 300) sustainabilityScore -= 10;
  
  // Crop health consideration
  if (cropAnalysis && cropAnalysis.cropHealth === 'excellent') sustainabilityScore += 5;
  
  sustainabilityScore = Math.min(100, Math.max(0, sustainabilityScore));
  
  // Estimate yield increase and cost
  const expectedYieldIncrease = Math.round(5 + (sustainabilityScore - 50) * 0.4); // 5-25% increase
  const costEstimate = Math.round(
    (finalRecommendation.nitrogen * 0.8) + 
    (finalRecommendation.phosphorus * 1.2) + 
    (finalRecommendation.potassium * 0.6) +
    (soilData.organicCarbon < 1.0 ? 50 : 0) // Organic matter cost
  );
  
  return {
    fertilizer: finalRecommendation,
    products,
    sustainabilityScore,
    applicationSchedule,
    weatherConsiderations,
    expectedYieldIncrease,
    costEstimate
  };
};