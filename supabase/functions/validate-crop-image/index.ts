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

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    
    if (!apiKey) {
      console.error("GOOGLE_VISION_API_KEY not found");
      return new Response(
        JSON.stringify({ valid: false, message: "Vision API not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Calling Vision API for image validation...");

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [{ type: "LABEL_DETECTION", maxResults: 10 }],
            },
          ],
        }),
      }
    );

    const data = await visionResponse.json();
    console.log("Vision API response:", JSON.stringify(data, null, 2));

    const labels =
      data.responses?.[0]?.labelAnnotations?.map((l) =>
        l.description.toLowerCase()
      ) || [];

    console.log("Detected labels:", labels);

    const plantKeywords = [
      "plant",
      "leaf",
      "crop",
      "wheat",
      "maize",
      "rice",
      "vegetation",
      "field",
      "agriculture",
      "farming",
      "green",
    ];

    const isCrop = labels.some((label) =>
      plantKeywords.some((keyword) => label.includes(keyword))
    );

    if (!isCrop) {
      console.log("Image validation failed - not a crop image");
      return new Response(
        JSON.stringify({
          valid: false,
          message:
            "Invalid image detected. Please upload a crop or plant image.",
          labels: labels,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Image validated successfully as crop image");

    return new Response(
      JSON.stringify({
        valid: true,
        confidence: 0.95,
        labels: labels,
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
