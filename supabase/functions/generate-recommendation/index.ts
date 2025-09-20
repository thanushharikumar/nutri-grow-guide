import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface SoilData {
  soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicCarbon: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  description: string;
  location: string;
}

interface CropAnalysisResult {
  cropHealth: 'excellent' | 'good' | 'fair' | 'poor';
  deficiencies: any[];
  recommendations: string[];
  confidence: number;
}

interface RecommendationRequest {
  cropType: string;
  soilData: SoilData;
  weatherData: WeatherData;
  cropAnalysis?: CropAnalysisResult;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cropType, soilData, weatherData, cropAnalysis }: RecommendationRequest = await req.json();

    // Get base fertilizer requirements from database
    const { data: fertilizerRule } = await supabase
      .from('fertilizer_rules')
      .select('*')
      .eq('crop', cropType.toLowerCase())
      .single();

    let baseRecommendation = {
      nitrogen: fertilizerRule?.n_min || 120,
      phosphorus: fertilizerRule?.p_min || 60,
      potassium: fertilizerRule?.k_min || 40
    };

    // Apply soil-based adjustments
    const pHAdjustment = soilData.pH < 6.0 ? 1.1 : soilData.pH > 8.0 ? 0.9 : 1.0;
    
    const soilTypeAdjustment = {
      sandy: { n: 1.2, p: 1.1, k: 1.3 },
      loamy: { n: 1.0, p: 1.0, k: 1.0 },
      clayey: { n: 0.9, p: 1.2, k: 0.8 },
      silty: { n: 1.0, p: 1.0, k: 1.1 }
    };

    const adjustment = soilTypeAdjustment[soilData.soilType];

    // Adjust for existing soil nutrients
    const nitrogenAdjustment = Math.max(0.3, 1 - (soilData.nitrogen / 300));
    const phosphorusAdjustment = Math.max(0.3, 1 - (soilData.phosphorus / 50));
    const potassiumAdjustment = Math.max(0.3, 1 - (soilData.potassium / 200));

    // Weather adjustments
    const rainfallAdjustment = weatherData.rainfall > 5 ? 1.1 : 0.95;
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
    const finalRecommendation = {
      nitrogen: Math.round(baseRecommendation.nitrogen * 
                pHAdjustment * adjustment.n * nitrogenAdjustment * 
                rainfallAdjustment * temperatureAdjustment * cropHealthAdjustment),
      phosphorus: Math.round(baseRecommendation.phosphorus * 
                  pHAdjustment * adjustment.p * phosphorusAdjustment * temperatureAdjustment),
      potassium: Math.round(baseRecommendation.potassium * 
                 pHAdjustment * adjustment.k * potassiumAdjustment * temperatureAdjustment)
    };

    // Generate product recommendations
    const products = [
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

    // Add organic fertilizer if needed
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
    const applicationSchedule = [
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

    // Calculate sustainability score
    let sustainabilityScore = 60;
    if (soilData.organicCarbon > 1.5) sustainabilityScore += 15;
    else if (soilData.organicCarbon > 1.0) sustainabilityScore += 10;
    sustainabilityScore += 10; // For using soil testing
    sustainabilityScore += 10; // Weather-responsive farming
    
    const totalNutrients = finalRecommendation.nitrogen + finalRecommendation.phosphorus + finalRecommendation.potassium;
    if (totalNutrients > 300) sustainabilityScore -= 10;
    if (cropAnalysis && cropAnalysis.cropHealth === 'excellent') sustainabilityScore += 5;
    sustainabilityScore = Math.min(100, Math.max(0, sustainabilityScore));

    // Calculate yield increase and cost
    const expectedYieldIncrease = Math.round(5 + (sustainabilityScore - 50) * 0.4);
    const costEstimate = Math.round(
      (finalRecommendation.nitrogen * 0.8) + 
      (finalRecommendation.phosphorus * 1.2) + 
      (finalRecommendation.potassium * 0.6) +
      (soilData.organicCarbon < 1.0 ? 50 : 0)
    );

    const result = {
      fertilizer: finalRecommendation,
      products,
      sustainabilityScore,
      applicationSchedule,
      weatherConsiderations,
      expectedYieldIncrease,
      costEstimate
    };

    // Store recommendation in database
    const { error: insertError } = await supabase
      .from('fertilizer_recommendations')
      .insert({
        crop_type: cropType,
        soil_data: soilData,
        weather_data: weatherData,
        nitrogen_recommendation: finalRecommendation.nitrogen,
        phosphorus_recommendation: finalRecommendation.phosphorus,
        potassium_recommendation: finalRecommendation.potassium,
        products,
        application_schedule: applicationSchedule,
        sustainability_score: sustainabilityScore,
        expected_yield_increase: expectedYieldIncrease,
        cost_estimate: costEstimate,
        weather_considerations: weatherConsiderations
      });

    if (insertError) {
      console.error('Error storing recommendation:', insertError);
    }

    // Also log to the original recommendation_logs table for compatibility
    const { error: logError } = await supabase
      .from('recommendation_logs')
      .insert({
        crop: cropType,
        n: soilData.nitrogen,
        p: soilData.phosphorus,
        k: soilData.potassium,
        ph: soilData.pH,
        oc: soilData.organicCarbon,
        output: result
      });

    if (logError) {
      console.error('Error logging recommendation:', logError);
    }

    console.log('Generated recommendation for:', cropType);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-recommendation function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate recommendation' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);