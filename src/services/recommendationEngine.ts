import { supabase } from "@/integrations/supabase/client";
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

export const generateRecommendation = async (
  cropType: string,
  soilData: SoilData,
  weatherData: WeatherData,
  cropAnalysis?: CropAnalysisResult
): Promise<RecommendationResult> => {
  try {
    // First, get ML prediction
    const mlPrediction = await getMLPrediction(cropType, soilData, weatherData, cropAnalysis);
    
    // Call Supabase edge function for recommendation generation with ML prediction
    const { data, error } = await supabase.functions.invoke('generate-recommendation', {
      body: { 
        cropType,
        soilData,
        weatherData,
        cropAnalysis,
        mlPrediction // Include ML prediction data
      }
    });

    if (error) {
      console.error('Error calling recommendation function:', error);
      // Fallback to local generation with ML prediction data
      return generateLocalRecommendation(cropType, soilData, weatherData, cropAnalysis, mlPrediction);
    }

    if (!data) {
      console.warn('No recommendation data received from edge function');
      // Fallback to local generation with ML prediction data
      return generateLocalRecommendation(cropType, soilData, weatherData, cropAnalysis, mlPrediction);
    }

    return data as RecommendationResult;
  } catch (error) {
    console.error('Error generating recommendation:', error);
    // Fallback to local generation if edge function fails
    return generateLocalRecommendation(cropType, soilData, weatherData, cropAnalysis);
  }
};

// New function to get ML predictions
const getMLPrediction = async (
  cropType: string,
  soilData: SoilData,
  weatherData: WeatherData,
  cropAnalysis?: CropAnalysisResult
) => {
  try {
    console.log('Calling ML prediction service with data:', {
      cropType,
      soilData,
      weatherData
    });

    const { data, error } = await supabase.functions.invoke('ml-prediction', {
      body: {
        N: soilData.nitrogen,
        P: soilData.phosphorus,
        K: soilData.potassium,
        pH: soilData.pH,
        organicCarbon: soilData.organicCarbon,
        cropType: cropType,
        soilType: soilData.soilType,
        temperature: weatherData.temperature,
        rainfall: weatherData.rainfall,
        humidity: weatherData.humidity
      }
    });

    if (error) {
      console.error('ML prediction error:', error);
      return null;
    }

    console.log('ML Prediction successful:', data);
    return data;
  } catch (error) {
    console.error('Error calling ML prediction service:', error);
    return null;
  }
};

// Fallback local recommendation generation
const generateLocalRecommendation = (
  cropType: string,
  soilData: SoilData,
  weatherData: WeatherData,
  cropAnalysis?: CropAnalysisResult,
  mlPrediction?: any // Add ML prediction parameter
): RecommendationResult => {
  
  // Base fertilizer requirements by crop type
  const cropRequirements: Record<string, FertilizerRecommendation> = {
    rice: { nitrogen: 120, phosphorus: 60, potassium: 40 },
    wheat: { nitrogen: 150, phosphorus: 80, potassium: 60 },
    maize: { nitrogen: 180, phosphorus: 90, potassium: 70 },
    millets: { nitrogen: 60, phosphorus: 40, potassium: 30 }
  };
  
  let baseRecommendation = cropRequirements[cropType.toLowerCase()] || cropRequirements.rice;
  
  // Use ML prediction if available to enhance base recommendation
  if (mlPrediction?.prediction) {
    console.log('Using ML prediction to enhance recommendation:', mlPrediction.prediction);
    
    // Adjust base recommendation based on ML prediction
    const mlFertilizerType = mlPrediction.prediction.type;
    const mlAmount = mlPrediction.prediction.amount;
    const mlConfidence = mlPrediction.prediction.confidence;
    
    // Apply ML adjustments based on fertilizer type and confidence
    if (mlConfidence > 0.7) {
      switch (mlFertilizerType) {
        case 'Urea':
          baseRecommendation.nitrogen = Math.round(baseRecommendation.nitrogen * 1.2);
          break;
        case 'DAP':
          baseRecommendation.phosphorus = Math.round(baseRecommendation.phosphorus * 1.3);
          break;
        case 'MOP':
          baseRecommendation.potassium = Math.round(baseRecommendation.potassium * 1.3);
          break;
        case 'NPK':
          baseRecommendation.nitrogen = Math.round(baseRecommendation.nitrogen * 1.1);
          baseRecommendation.phosphorus = Math.round(baseRecommendation.phosphorus * 1.1);
          baseRecommendation.potassium = Math.round(baseRecommendation.potassium * 1.1);
          break;
      }
    }
  }
  
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
  
  // Calculate sustainability score (0-100) - more dynamic scoring
  let sustainabilityScore = 40; // Lower base score for more variation
  
  // Soil health contribution (0-25 points)
  const soilQualityScore = Math.min(25, 
    (soilData.organicCarbon * 8) + // Organic carbon importance
    (soilData.pH >= 6.0 && soilData.pH <= 7.5 ? 8 : 0) + // Optimal pH bonus
    (soilData.soilType === 'loamy' ? 5 : 0) // Loamy soil bonus
  );
  sustainabilityScore += soilQualityScore;
  
  // Fertilizer efficiency (0-20 points)
  const totalNutrients = finalRecommendation.nitrogen + finalRecommendation.phosphorus + finalRecommendation.potassium;
  const fertilizerEfficiency = Math.max(0, 20 - (totalNutrients / 20)); // Lower usage = higher score
  sustainabilityScore += fertilizerEfficiency;
  
  // Weather adaptation (0-15 points)
  const weatherScore = Math.min(15,
    (weatherData.rainfall > 2 && weatherData.rainfall < 8 ? 8 : 3) + // Optimal rainfall
    (weatherData.temperature > 20 && weatherData.temperature < 35 ? 7 : 2) // Optimal temperature
  );
  sustainabilityScore += weatherScore;
  
  // Crop health impact (0-20 points)
  const cropHealthScore = cropAnalysis ? 
    { 'excellent': 20, 'good': 15, 'fair': 8, 'poor': 2 }[cropAnalysis.cropHealth] || 0 : 10;
  sustainabilityScore += cropHealthScore;
  
  sustainabilityScore = Math.min(100, Math.max(20, sustainabilityScore));
  
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