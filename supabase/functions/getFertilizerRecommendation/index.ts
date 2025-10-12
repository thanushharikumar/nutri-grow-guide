import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VISION_KEY = Deno.env.get("GOOGLE_VISION_API_KEY")!;
const WEATHER_KEY = Deno.env.get("OPENWEATHER_API_KEY") || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ML model rules (paste exported JSON from train_models_with_export.py)
// After training, copy contents from models/*.json files here
const ML_RULES = {
  preprocessing: {
    numeric_features: ["nitrogen", "phosphorus", "potassium", "ph"],
    means: [50, 30, 30, 6.5],
    scales: [20, 15, 15, 1.0],
    categorical_mappings: {}
  },
  // Paste regressor_N_rules.json content here
  n_regressor: null,
  // Paste regressor_P2O5_rules.json content here
  p_regressor: null,
  // Paste regressor_K2O_rules.json content here
  k_regressor: null
};

// ML prediction helper - evaluates decision tree rules
function predictWithRules(features: number[], rules: any): number | null {
  if (!rules || !rules.trees || rules.trees.length === 0) return null;
  
  const predictions: number[] = [];
  
  // Average predictions from multiple trees
  for (const tree of rules.trees) {
    for (const rule of tree) {
      let matches = true;
      
      // Check all conditions
      for (const cond of rule.conditions) {
        const featureName = cond.feature.toLowerCase();
        let featureIdx = -1;
        
        // Map feature name to index
        if (featureName.includes("nitrogen") || featureName.includes("n_ppm")) featureIdx = 0;
        else if (featureName.includes("phosphorus") || featureName.includes("p_ppm")) featureIdx = 1;
        else if (featureName.includes("potassium") || featureName.includes("k_ppm")) featureIdx = 2;
        else if (featureName.includes("ph")) featureIdx = 3;
        
        if (featureIdx === -1) continue;
        
        const value = features[featureIdx] || 0;
        
        if (cond.op === "<=") {
          if (value > cond.value) matches = false;
        } else if (cond.op === ">") {
          if (value <= cond.value) matches = false;
        }
        
        if (!matches) break;
      }
      
      if (matches) {
        predictions.push(rule.prediction);
        break;
      }
    }
  }
  
  // Return average prediction
  return predictions.length > 0 
    ? Math.round(predictions.reduce((a, b) => a + b) / predictions.length)
    : null;
}

// Preprocess features for ML model
function preprocessFeatures(nitrogen: number, phosphorus: number, potassium: number, pH: number) {
  const { means, scales } = ML_RULES.preprocessing;
  
  const raw = [
    nitrogen || means[0],
    phosphorus || means[1],
    potassium || means[2],
    pH || means[3]
  ];
  
  // Normalize features
  return raw.map((val, i) => (val - means[i]) / scales[i]);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      cropType,
      soilType,
      pH,
      nitrogen,
      phosphorus,
      potassium,
      organicCarbon,
      latitude,
      longitude,
      imageBase64
    } = body;

    if (!cropType || !soilType) {
      return new Response(
        JSON.stringify({ error: "cropType and soilType required" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Received recommendation request:', { cropType, soilType, latitude, longitude });

    // Compute image hash for caching
    const imgHash = imageBase64 ? hashString(imageBase64.slice(0, 200)) : null;

    // 1️⃣ Check cache for Vision API result
    let visionResult: any = null;
    if (imgHash) {
      const { data: cacheRows } = await supabase
        .from("image_analysis_cache")
        .select("vision_result")
        .eq("image_hash", imgHash)
        .limit(1);
      
      if (cacheRows && cacheRows.length) {
        visionResult = cacheRows[0].vision_result;
        console.log('Using cached Vision API result');
      }
    }

    // 2️⃣ Call Vision API if not cached
    if (!visionResult && imageBase64) {
      try {
        visionResult = await callVisionApi(imageBase64);
        
        if (!visionResult.isPlant) {
          return new Response(
            JSON.stringify({ error: "Invalid image - no plant detected" }), 
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Store in cache
        if (imgHash) {
          await supabase.from("image_analysis_cache").insert({
            image_hash: imgHash,
            vision_result: visionResult,
          });
        }
        
        console.log('Vision API result:', visionResult);
      } catch (err) {
        console.error('Vision API error:', err);
        return new Response(
          JSON.stringify({ error: "Unable to validate image. Please try again." }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3️⃣ Fetch real-time weather data
    let weatherData: any = null;
    if (latitude && longitude && WEATHER_KEY) {
      try {
        const weatherResp = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_KEY}&units=metric`
        );
        
        if (weatherResp.ok) {
          const weatherJson = await weatherResp.json();
          weatherData = {
            temperature: weatherJson.main?.temp ?? 28,
            rainfall: weatherJson.rain?.["1h"] ?? 0,
            humidity: weatherJson.main?.humidity ?? 60,
            windSpeed: weatherJson.wind?.speed ?? 5,
            description: weatherJson.weather?.[0]?.description ?? "Clear sky"
          };
          console.log('Weather data fetched:', weatherData);
        }
      } catch (err) {
        console.error('Weather API error:', err);
      }
    }

    // Default weather if not fetched
    if (!weatherData) {
      weatherData = {
        temperature: 28,
        rainfall: 0,
        humidity: 60,
        windSpeed: 5,
        description: "Clear sky"
      };
    }

    // 4️⃣ Get ML predictions if available
    const mlFeatures = preprocessFeatures(nitrogen, phosphorus, potassium, pH);
    const mlN = predictWithRules(mlFeatures, ML_RULES.n_regressor);
    const mlP = predictWithRules(mlFeatures, ML_RULES.p_regressor);
    const mlK = predictWithRules(mlFeatures, ML_RULES.k_regressor);
    
    console.log('ML predictions:', { mlN, mlP, mlK });
    
    // Compute fertilizer recommendation with ML + rule-based fallback
    const cropRequirements: Record<string, { nitrogen: number; phosphorus: number; potassium: number }> = {
      rice: { nitrogen: 120, phosphorus: 60, potassium: 40 },
      wheat: { nitrogen: 150, phosphorus: 80, potassium: 60 },
      maize: { nitrogen: 180, phosphorus: 90, potassium: 70 },
      millets: { nitrogen: 60, phosphorus: 40, potassium: 30 }
    };
    
    // Use ML predictions if available, otherwise fall back to rule-based
    let baseRecommendation = {
      nitrogen: mlN || cropRequirements[cropType.toLowerCase()]?.nitrogen || cropRequirements.rice.nitrogen,
      phosphorus: mlP || cropRequirements[cropType.toLowerCase()]?.phosphorus || cropRequirements.rice.phosphorus,
      potassium: mlK || cropRequirements[cropType.toLowerCase()]?.potassium || cropRequirements.rice.potassium
    };
    
    // Apply nutrient deficiency adjustments from Vision API
    if (visionResult && visionResult.deficiency) {
      const def = visionResult.deficiency.toLowerCase();
      if (def.includes("nitrogen")) {
        baseRecommendation.nitrogen *= 1.15;
        console.log('Nitrogen deficiency detected - increasing N by 15%');
      }
      if (def.includes("phosphorus")) {
        baseRecommendation.phosphorus *= 1.12;
        console.log('Phosphorus deficiency detected - increasing P by 12%');
      }
      if (def.includes("potassium")) {
        baseRecommendation.potassium *= 1.12;
        console.log('Potassium deficiency detected - increasing K by 12%');
      }
    }
    
    // Adjust based on soil analysis
    const pHAdjustment = pH < 6.0 ? 1.1 : pH > 8.0 ? 0.9 : 1.0;
    const soilTypeAdjustments: Record<string, { n: number; p: number; k: number }> = {
      sandy: { n: 1.2, p: 1.1, k: 1.3 },
      loamy: { n: 1.0, p: 1.0, k: 1.0 },
      clayey: { n: 0.9, p: 1.2, k: 0.8 },
      silty: { n: 1.0, p: 1.0, k: 1.1 }
    };
    
    const adjustment = soilTypeAdjustments[soilType] || soilTypeAdjustments.loamy;
    
    const nitrogenAdjustment = Math.max(0.3, 1 - (nitrogen / 300));
    const phosphorusAdjustment = Math.max(0.3, 1 - (phosphorus / 50));
    const potassiumAdjustment = Math.max(0.3, 1 - (potassium / 200));
    
    const finalRecommendation = {
      nitrogen: Math.round(baseRecommendation.nitrogen * pHAdjustment * adjustment.n * nitrogenAdjustment),
      phosphorus: Math.round(baseRecommendation.phosphorus * pHAdjustment * adjustment.p * phosphorusAdjustment),
      potassium: Math.round(baseRecommendation.potassium * pHAdjustment * adjustment.k * potassiumAdjustment)
    };

    // 5️⃣ Compute dynamic sustainability score
    let sustainabilityScore = 30;
    
    // Soil health (0-25 points)
    const soilQualityScore = Math.min(25,
      (organicCarbon * 8) +
      (pH >= 6.0 && pH <= 7.5 ? 8 : Math.max(0, 8 - Math.abs(pH - 6.75) * 3)) +
      (soilType === 'loamy' ? 5 : soilType === 'silty' ? 3 : 0)
    );
    sustainabilityScore += soilQualityScore;
    
    // Fertilizer efficiency (0-25 points)
    const totalNutrients = finalRecommendation.nitrogen + finalRecommendation.phosphorus + finalRecommendation.potassium;
    const fertilizerEfficiency = Math.max(0, 25 - (totalNutrients / 15));
    sustainabilityScore += fertilizerEfficiency;
    
    // Nutrient utilization (0-15 points)
    const nutrientUtilization = Math.min(15,
      (nitrogen / 300) * 5 +
      (phosphorus / 50) * 5 +
      (potassium / 200) * 5
    );
    sustainabilityScore += nutrientUtilization;
    
    // Weather adaptation (0-15 points)
    const weatherScore = Math.min(15,
      (weatherData.rainfall > 2 && weatherData.rainfall < 8 ? 8 : Math.max(0, 8 - Math.abs(weatherData.rainfall - 5))) +
      (weatherData.temperature > 20 && weatherData.temperature < 35 ? 7 : Math.max(0, 7 - Math.abs(weatherData.temperature - 27.5) * 0.3))
    );
    sustainabilityScore += weatherScore;
    
    // Crop health impact (0-20 points) - default good
    sustainabilityScore += 14;
    
    sustainabilityScore = Math.min(100, Math.max(0, Math.round(sustainabilityScore)));

    console.log('Sustainability score breakdown:', {
      soilQualityScore,
      fertilizerEfficiency,
      nutrientUtilization,
      weatherScore,
      final: sustainabilityScore
    });

    // 6️⃣ Generate product recommendations
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

    if (organicCarbon < 1.0) {
      products.push({
        name: "Compost/FYM",
        type: "organic",
        quantity: 2500,
        applicationTiming: "2-3 weeks before planting",
        method: "Broadcasting and deep incorporation"
      });
    }

    // 7️⃣ Generate application schedule
    const applicationSchedule = [
      {
        stage: "Land Preparation",
        daysAfterPlanting: -14,
        fertilizers: organicCarbon < 1.0 ? ["Compost/FYM", "Full P2O5", "50% K2O"] : ["Full P2O5", "50% K2O"],
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
        quantity: `${Math.round(finalRecommendation.nitrogen * 0.2)} kg N/ha + ${Math.round(finalRecommendation.potassium * 0.5)} kg K2O/ha`,
        method: "Foliar spray"
      }
    ];

    // 8️⃣ Weather considerations
    const weatherConsiderations = [];
    if (weatherData.rainfall > 8) {
      weatherConsiderations.push("High rainfall - use split applications to reduce nutrient loss");
    }
    if (weatherData.temperature > 32) {
      weatherConsiderations.push("High temperature - apply fertilizers early morning or evening");
    }
    if (weatherData.humidity > 80) {
      weatherConsiderations.push("High humidity - ensure good ventilation for foliar applications");
    }

    // 9️⃣ Calculate estimates
    const expectedYieldIncrease = Math.round(5 + (sustainabilityScore - 50) * 0.4);
    const costEstimate = Math.round(
      (finalRecommendation.nitrogen * 0.8) + 
      (finalRecommendation.phosphorus * 1.2) + 
      (finalRecommendation.potassium * 0.6) +
      (organicCarbon < 1.0 ? 50 : 0)
    );

    // 🔟 Log to database
    try {
      await supabase.from("recommendation_logs").insert({
        crop: cropType,
        n: nitrogen,
        p: phosphorus,
        k: potassium,
        ph: pH,
        oc: organicCarbon,
        output: {
          fertilizer: finalRecommendation,
          ml_predictions: { n: mlN, p: mlP, k: mlK },
          ml_used: !!(mlN || mlP || mlK),
          sustainabilityScore,
          visionResult,
          weather: weatherData
        }
      });
    } catch (err) {
      console.error('Failed to log recommendation:', err);
    }

    // 1️⃣1️⃣ Return complete result
    return new Response(
      JSON.stringify({
        fertilizer: finalRecommendation,
        ml_predictions: {
          nitrogen_kg_per_ha: mlN,
          p2o5_kg_per_ha: mlP,
          k2o_kg_per_ha: mlK,
          model_used: !!(mlN || mlP || mlK)
        },
        products,
        sustainabilityScore,
        applicationSchedule,
        weatherConsiderations,
        expectedYieldIncrease,
        costEstimate,
        weather: weatherData,
        nutrientAnalysis: visionResult?.deficiency || "Normal leaf color detected"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("Error in getFertilizerRecommendation:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Call Google Vision API to analyze crop image
 */
async function callVisionApi(base64body: string) {
  if (!VISION_KEY) {
    console.warn("GOOGLE_VISION_API_KEY not set - skipping Vision API validation");
    return { isPlant: false };
  }

  const body = {
    requests: [
      {
        image: { content: base64body },
        features: [
          { type: "LABEL_DETECTION", maxResults: 10 },
          { type: "IMAGE_PROPERTIES", maxResults: 1 }
        ]
      }
    ]
  };

  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Vision API error: " + text);
  }

  const json = await res.json();
  const resp = json.responses?.[0] || {};
  const labels = (resp.labelAnnotations || []).map((l: any) => (l.description || "").toLowerCase());
  const validKeywords = ["plant", "leaf", "crop", "agriculture", "vegetation", "maize", "rice", "wheat", "millet"];
  const isPlant = labels.some((lbl: string) => validKeywords.some(k => lbl.includes(k)));
  const colors = resp.imagePropertiesAnnotation?.dominantColors?.colors || [];
  
  let avgGreen = 0;
  if (colors.length) {
    avgGreen = Math.round(colors.reduce((acc: number, c: any) => acc + (c.color?.green || 0), 0) / colors.length);
  }

  let deficiency = "Healthy";
  if (avgGreen < 70) deficiency = "Nitrogen deficiency likely";
  else if (avgGreen < 110) deficiency = "Phosphorus/pale stress possible";
  else if (avgGreen < 150) deficiency = "Potassium stress possible";

  return { labels, isPlant, avgGreen, deficiency };
}

/**
 * Simple hash function for image fingerprinting
 */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
  }
  return String(h >>> 0);
}
