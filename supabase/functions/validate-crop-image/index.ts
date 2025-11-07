import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ valid: false, message: "No image provided" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const apiKey = Deno.env.get("KINDWISE_API_KEY");
    
    if (!apiKey) {
      console.error("KINDWISE_API_KEY not found");
      return new Response(
        JSON.stringify({ valid: false, message: "Crop validation API not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Calling Kindwise Crop.health API for image validation...");

    const kindwiseResponse = await fetch(
      "https://crop.kindwise.com/api/v1/identification",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Api-Key": apiKey
        },
        body: JSON.stringify({
          images: [image],
          similar_images: true,
        }),
      }
    );

    console.log("Kindwise API status:", kindwiseResponse.status);

    // Check response status first
    if (!kindwiseResponse.ok) {
      const errorText = await kindwiseResponse.text();
      console.error("Kindwise API error response:", errorText);
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: "Image validation service error. Please check API key configuration." 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Try to parse JSON response
    let data;
    try {
      data = await kindwiseResponse.json();
      console.log("Kindwise API response:", JSON.stringify(data, null, 2));
    } catch (parseError) {
      const responseText = await kindwiseResponse.text();
      console.error("Failed to parse Kindwise response as JSON:", responseText);
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: "Invalid response from image validation service" 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check for API errors in response data
    if (data.error) {
      const errorMsg = data.error?.message || data.message || "Unknown error";
      console.warn("Kindwise API error:", errorMsg);
      
      return new Response(
        JSON.stringify({ valid: false, message: "Image validation service error" }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // First check if it's recognized as a plant at all
    const isPlant = data.result?.is_plant;
    console.log("Is plant check:", isPlant);

    if (!isPlant || !isPlant.binary) {
      console.log("Image validation failed - not recognized as a plant");
      return new Response(
        JSON.stringify({
          valid: false,
          message: `This doesn't appear to be a plant image (${Math.round((isPlant?.probability || 0) * 100)}% confidence). Please upload a clear photo of a crop or plant.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the API identified any crop
    const cropSuggestions = data.result?.crop?.suggestions || [];
    console.log("Crop suggestions:", cropSuggestions);

    // Validate if it's a crop image - check if top suggestion has reasonable probability
    const topCropSuggestion = cropSuggestions[0];
    
    if (!topCropSuggestion || topCropSuggestion.probability < 0.15) {
      console.log("Image validation failed - not a crop image or low confidence");
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Unable to identify a specific crop. Please upload a clearer image showing the plant more prominently.",
          suggestions: cropSuggestions.slice(0, 3),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Image validated successfully as crop image:", topCropSuggestion.name);

    return new Response(
      JSON.stringify({
        valid: true,
        confidence: topCropSuggestion.probability,
        crop: topCropSuggestion.name,
        scientificName: topCropSuggestion.scientific_name,
        suggestions: cropSuggestions.slice(0, 3),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in validate-crop-image function:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        message: error.message || "Error validating image",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
