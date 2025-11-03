import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface RecommendationRequest {
  cropType: string;
  soilType: string;
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicCarbon: number;
  latitude?: number;
  longitude?: number;
  imageBase64?: string | null;
}

async function getFertilizerRecommendation(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqData = await req.json() as RecommendationRequest;
    console.log('Processing recommendation for crop:', reqData.cropType);

    // Get weather data if coordinates provided
    let weatherData: any = null;
    if (reqData.latitude && reqData.longitude) {
      const { data: weather } = await supabase.functions.invoke('get-weather', {
        body: { lat: reqData.latitude, lon: reqData.longitude }
      });
      weatherData = weather;
    }

    // Prepare soil data object
    const soilData = {
      soilType: reqData.soilType,
      pH: reqData.pH,
      nitrogen: reqData.nitrogen,
      phosphorus: reqData.phosphorus,
      potassium: reqData.potassium,
      organicCarbon: reqData.organicCarbon
    };

    // Get base fertilizer requirements from database
    const { data: fertilizerRule } = await supabase
      .from('fertilizer_rules')
      .select('*')
      .eq('crop', reqData.cropType.toLowerCase())
      .single();

    let baseRecommendation = {
      nitrogen: fertilizerRule?.n_min || 120,
      phosphorus: fertilizerRule?.p_min || 60,
      potassium: fertilizerRule?.k_min || 40
    };

    // Apply soil-based adjustments
    const pHAdjustment = soilData.pH < 6.0 ? 1.1 : soilData.pH > 8.0 ? 0.9 : 1.0;
    
    const soilTypeAdjustment: Record<string, { n: number; p: number; k: number }> = {
      sandy: { n: 1.2, p: 1.1, k: 1.3 },
      loamy: { n: 1.0, p: 1.0, k: 1.0 },
      clayey: { n: 0.9, p: 1.2, k: 0.8 },
      silty: { n: 1.0, p: 1.0, k: 1.1 }
    };

    const adjustment = soilTypeAdjustment[soilData.soilType] || { n: 1.0, p: 1.0, k: 1.0 };

    // Adjust for existing soil nutrients
    const nitrogenAdjustment = Math.max(0.3, 1 - (soilData.nitrogen / 300));
    const phosphorusAdjustment = Math.max(0.3, 1 - (soilData.phosphorus / 50));
    const potassiumAdjustment = Math.max(0.3, 1 - (soilData.potassium / 200));

    // Weather adjustments
    let rainfallAdjustment = 0.95;
    let temperatureAdjustment = 1.0;
    if (weatherData) {
      rainfallAdjustment = weatherData.rainfall > 5 ? 1.1 : 0.95;
      temperatureAdjustment = weatherData.temperature > 30 ? 1.05 : 1.0;
    }

    // Calculate final recommendation
    const finalRecommendation = {
      nitrogen: Math.round(baseRecommendation.nitrogen * 
                pHAdjustment * adjustment.n * nitrogenAdjustment * 
                rainfallAdjustment * temperatureAdjustment),
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
        applicationTiming: "Split: 50% planting, 30% tillering, 20% flowering",
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
        applicationTiming: "50% planting, 50% flowering",
        method: "Broadcasting and incorporation"
      }
    ];

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
        method: "Band placement"
      },
      {
        stage: "Vegetative Growth",
        daysAfterPlanting: 30,
        fertilizers: ["30% Nitrogen"],
        quantity: `${Math.round(finalRecommendation.nitrogen * 0.3)} kg N/ha`,
        method: "Side dressing"
      },
      {
        stage: "Reproductive Phase",
        daysAfterPlanting: 60,
        fertilizers: ["20% Nitrogen", "50% K2O"],
        quantity: `${Math.round(finalRecommendation.nitrogen * 0.2)} kg N/ha`,
        method: "Foliar spray"
      }
    ];

    // Weather considerations
    const weatherConsiderations: string[] = [];
    if (weatherData) {
      if (weatherData.rainfall > 8) {
        weatherConsiderations.push("High rainfall - use split applications");
      }
      if (weatherData.temperature > 32) {
        weatherConsiderations.push("High temperature - apply early morning/evening");
      }
      if (weatherData.humidity > 80) {
        weatherConsiderations.push("High humidity - ensure good ventilation");
      }
      if (weatherData.windSpeed > 10) {
        weatherConsiderations.push("High wind - avoid foliar applications");
      }
    }

    // Calculate sustainability score
    let sustainabilityScore = 50;
    sustainabilityScore += Math.min(15, soilData.organicCarbon * 10);
    sustainabilityScore += (soilData.pH >= 6.0 && soilData.pH <= 7.5 ? 10 : 0);
    sustainabilityScore += Math.max(-15, -((finalRecommendation.nitrogen + finalRecommendation.phosphorus + finalRecommendation.potassium) / 20));
    sustainabilityScore = Math.min(100, Math.max(0, Math.round(sustainabilityScore)));

    const expectedYieldIncrease = Math.round(5 + (sustainabilityScore - 50) * 0.3);
    const costEstimate = Math.round(
      (finalRecommendation.nitrogen * 0.8) + 
      (finalRecommendation.phosphorus * 1.2) + 
      (finalRecommendation.potassium * 0.6) +
      (soilData.organicCarbon < 1.0 ? 50 : 0)
    );

    const result = {
      fertilizer: finalRecommendation,
      fertilizers: [
        {
          type: "Urea",
          amount: Math.round(finalRecommendation.nitrogen / 0.46),
          unit: "kg/ha",
          timing: "Split application",
          applicationMethod: "Broadcasting"
        },
        {
          type: "DAP",
          amount: Math.round(finalRecommendation.phosphorus / 0.46),
          unit: "kg/ha",
          timing: "At planting",
          applicationMethod: "Band placement"
        },
        {
          type: "MOP",
          amount: Math.round(finalRecommendation.potassium / 0.6),
          unit: "kg/ha",
          timing: "Split application",
          applicationMethod: "Broadcasting"
        }
      ],
      products,
      sustainabilityScore,
      applicationSchedule,
      weatherConsiderations,
      expectedYieldIncrease,
      costEstimate,
      recommendations: [
        `Apply ${finalRecommendation.nitrogen} kg/ha of Nitrogen`,
        `Apply ${finalRecommendation.phosphorus} kg/ha of Phosphorus`,
        `Apply ${finalRecommendation.potassium} kg/ha of Potassium`,
        soilData.organicCarbon < 1.0 ? "Increase organic matter with compost" : "Maintain current organic matter levels"
      ]
    };

    // Store in database
    await supabase.from('fertilizer_recommendations').insert({
      crop_type: reqData.cropType,
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

    console.log('✅ Recommendation generated successfully');
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Error generating recommendation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

serve(getFertilizerRecommendation);