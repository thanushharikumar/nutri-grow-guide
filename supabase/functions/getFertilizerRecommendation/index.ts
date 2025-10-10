import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      imageUrl,
      imageBase64
    } = body;

    console.log('Received recommendation request:', { cropType, soilType, latitude, longitude });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // 1️⃣ Validate crop image using Google Vision API
    let imageValid = true;
    let imageValidationMessage = "";
    let nutrientHint = "";
    
    if (imageBase64) {
      try {
        const visionResult = await validateCropImageWithVision(imageBase64);
        imageValid = visionResult.valid;
        nutrientHint = visionResult.nutrientHint || "";
        
        if (!imageValid) {
          imageValidationMessage = visionResult.reason || "Invalid crop image detected.";
        }
        
        console.log('Vision API validation result:', { imageValid, nutrientHint });
      } catch (err) {
        console.error('Vision API error:', err);
        imageValid = false;
        imageValidationMessage = "Unable to validate image. Please try again.";
      }
    }

    if (!imageValid) {
      return new Response(
        JSON.stringify({ 
          error: imageValidationMessage || "Invalid image - please upload a clear crop image." 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2️⃣ Fetch real-time weather data
    let weatherData = {
      temperature: 28,
      rainfall: 0,
      humidity: 60,
      windSpeed: 5,
      description: "Clear sky"
    };

    if (latitude && longitude) {
      try {
        const openWeatherKey = Deno.env.get("OPENWEATHER_API_KEY");
        const weatherResp = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherKey}&units=metric`
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
        // Continue with default weather data
      }
    }

    // 3️⃣ Get ML prediction
    let mlPrediction = null;
    try {
      const { data: mlData, error: mlError } = await supabase.functions.invoke('ml-prediction', {
        body: {
          N: nitrogen,
          P: phosphorus,
          K: potassium,
          pH: pH,
          organicCarbon: organicCarbon,
          cropType: cropType,
          soilType: soilType,
          temperature: weatherData.temperature,
          rainfall: weatherData.rainfall,
          humidity: weatherData.humidity
        }
      });

      if (!mlError && mlData) {
        mlPrediction = mlData;
        console.log('ML Prediction received:', mlPrediction);
      }
    } catch (err) {
      console.error('ML prediction error:', err);
    }

    // 4️⃣ Compute fertilizer recommendation with nutrient deficiency adjustments
    const cropRequirements: Record<string, { nitrogen: number; phosphorus: number; potassium: number }> = {
      rice: { nitrogen: 120, phosphorus: 60, potassium: 40 },
      wheat: { nitrogen: 150, phosphorus: 80, potassium: 60 },
      maize: { nitrogen: 180, phosphorus: 90, potassium: 70 },
      millets: { nitrogen: 60, phosphorus: 40, potassium: 30 }
    };
    
    let baseRecommendation = cropRequirements[cropType.toLowerCase()] || cropRequirements.rice;
    
    // Apply nutrient deficiency adjustments from Vision API
    if (nutrientHint.toLowerCase().includes("nitrogen")) {
      baseRecommendation.nitrogen *= 1.15;
      console.log('Nitrogen deficiency detected - increasing N by 15%');
    }
    if (nutrientHint.toLowerCase().includes("phosphorus")) {
      baseRecommendation.phosphorus *= 1.12;
      console.log('Phosphorus deficiency detected - increasing P by 12%');
    }
    if (nutrientHint.toLowerCase().includes("potassium")) {
      baseRecommendation.potassium *= 1.12;
      console.log('Potassium deficiency detected - increasing K by 12%');
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
          sustainabilityScore,
          mlPrediction
        }
      });
    } catch (err) {
      console.error('Failed to log recommendation:', err);
    }

    // 1️⃣1️⃣ Return complete result
    return new Response(
      JSON.stringify({
        fertilizer: finalRecommendation,
        products,
        sustainabilityScore,
        applicationSchedule,
        weatherConsiderations,
        expectedYieldIncrease,
        costEstimate,
        weather: weatherData,
        mlPrediction: mlPrediction?.prediction,
        nutrientAnalysis: nutrientHint || "Normal leaf color detected"
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
 * Validate crop image using Google Vision API
 */
async function validateCropImageWithVision(imageBase64: string): Promise<{
  valid: boolean;
  reason?: string;
  nutrientHint?: string;
}> {
  const visionApiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
  
  if (!visionApiKey) {
    console.warn("GOOGLE_VISION_API_KEY not set - skipping Vision API validation");
    return { valid: true, nutrientHint: "Vision API not configured" };
  }

  try {
    // imageBase64 is already without data URL prefix (stripped by frontend)
    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 15 },
              { type: 'IMAGE_PROPERTIES', maxResults: 5 }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vision API error:', response.status, errorText);
      return { valid: false, reason: "Image validation failed" };
    }

    const data = await response.json();
    const annotations = data.responses?.[0];
    
    if (!annotations) {
      return { valid: false, reason: "Unable to analyze image" };
    }

    // Check for plant-related labels
    const labels = annotations.labelAnnotations?.map((l: any) => 
      l.description.toLowerCase()
    ) || [];
    
    const plantKeywords = ['plant', 'leaf', 'crop', 'vegetation', 'agriculture', 
                          'field', 'green', 'grass', 'tree', 'flower'];
    const hasPlantContent = labels.some((label: string) =>
      plantKeywords.some(keyword => label.includes(keyword))
    );

    if (!hasPlantContent) {
      return { 
        valid: false, 
        reason: "Image does not appear to contain plant or crop content" 
      };
    }

    // Analyze dominant color for nutrient deficiency indicators
    const dominantColors = annotations.imagePropertiesAnnotation?.dominantColors?.colors || [];
    const nutrientHint = analyzeLeafColorFromVision(dominantColors);

    console.log('Vision API labels:', labels);
    console.log('Nutrient analysis:', nutrientHint);

    return { 
      valid: true, 
      nutrientHint 
    };

  } catch (error) {
    console.error('Vision API request failed:', error);
    return { valid: false, reason: "Image validation service unavailable" };
  }
}

/**
 * Analyze dominant colors to detect nutrient deficiencies
 */
function analyzeLeafColorFromVision(colors: any[]): string {
  if (!colors || colors.length === 0) {
    return "Normal leaf color";
  }

  const topColor = colors[0]?.color;
  if (!topColor) return "Normal leaf color";

  const { red = 0, green = 0, blue = 0 } = topColor;

  // Nitrogen deficiency: Yellowing (low green, high red/yellow)
  if (green < 100 && red > 120 && blue < 100) {
    return "Nitrogen deficiency detected - yellowing leaves";
  }

  // Phosphorus deficiency: Purple/dark tint (high blue)
  if (blue > 130 && green < 110) {
    return "Phosphorus deficiency detected - purple/dark discoloration";
  }

  // Potassium deficiency: Pale/washed out (all values high but low saturation)
  if (red > 150 && green > 140 && blue > 140) {
    return "Potassium deficiency detected - pale/chlorotic leaves";
  }

  // Healthy green vegetation
  if (green > 100 && green > red && green > blue) {
    return "Healthy leaf color detected";
  }

  return "Normal leaf color";
}
