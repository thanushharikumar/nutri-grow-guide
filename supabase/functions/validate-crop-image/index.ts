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
          similar_images: false,
        }),
      }
    );

    const data = await kindwiseResponse.json();
    console.log("Kindwise API response:", JSON.stringify(data, null, 2));

    // Check for API errors
    if (!kindwiseResponse.ok || data.error) {
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

    // Check if the API identified any crop
    const cropSuggestions = data.result?.crop?.suggestions || [];
    console.log("Crop suggestions:", cropSuggestions);

    // Validate if it's a crop image - check if top suggestion has reasonable probability
    const topCropSuggestion = cropSuggestions[0];
    
    if (!topCropSuggestion || topCropSuggestion.probability < 0.3) {
      console.log("Image validation failed - not a crop image or low confidence");
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Invalid image detected. Please upload a clear crop or plant image.",
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
