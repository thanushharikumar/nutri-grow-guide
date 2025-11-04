import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedSoilData {
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  pH: number | null;
  organicCarbon: number | null;
  soilType: string | null;
  cardNumber: string | null;
  location: string | null;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
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
        JSON.stringify({ error: "Vision API not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Calling Vision API for OCR...");

    // Call Google Vision API for text detection
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [
                { type: "TEXT_DETECTION", maxResults: 1 },
                { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }
              ],
            },
          ],
        }),
      }
    );

    const data = await visionResponse.json();
    console.log("Vision API response received");

    const fullText = data.responses?.[0]?.fullTextAnnotation?.text || "";
    console.log("Extracted text length:", fullText.length);

    if (!fullText) {
      return new Response(
        JSON.stringify({ 
          error: "No text detected in image. Please upload a clear Soil Health Card image.",
          extractedData: null 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract soil data from text
    const extractedData = extractSoilDataFromText(fullText);
    
    console.log("Extracted soil data:", extractedData);

    // Validate that we extracted at least some meaningful data
    if (!extractedData.nitrogen && !extractedData.phosphorus && !extractedData.potassium) {
      return new Response(
        JSON.stringify({ 
          error: "Could not extract soil nutrient data from the image. Please ensure the image is a clear Soil Health Card.",
          extractedData,
          rawText: fullText.substring(0, 500) // Return partial text for debugging
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        extractedData,
        rawText: fullText.substring(0, 200) // Partial text for reference
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in extract-soil-health-card function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error extracting data from Soil Health Card",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function extractSoilDataFromText(text: string): ExtractedSoilData {
  const result: ExtractedSoilData = {
    nitrogen: null,
    phosphorus: null,
    potassium: null,
    pH: null,
    organicCarbon: null,
    soilType: null,
    cardNumber: null,
    location: null,
    confidence: 0
  };

  let matchCount = 0;
  const normalizedText = text.toLowerCase();

  // Extract Nitrogen (N)
  const nitrogenPatterns = [
    /nitrogen[:\s]*(\d+\.?\d*)/i,
    /\bn[:\s]*(\d+\.?\d*)/i,
    /available\s+nitrogen[:\s]*(\d+\.?\d*)/i,
    /n\s*\(kg\/ha\)[:\s]*(\d+\.?\d*)/i
  ];
  
  for (const pattern of nitrogenPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.nitrogen = parseFloat(match[1]);
      matchCount++;
      break;
    }
  }

  // Extract Phosphorus (P)
  const phosphorusPatterns = [
    /phosphorus[:\s]*(\d+\.?\d*)/i,
    /\bp[:\s]*(\d+\.?\d*)/i,
    /available\s+phosphorus[:\s]*(\d+\.?\d*)/i,
    /p\s*\(kg\/ha\)[:\s]*(\d+\.?\d*)/i,
    /p2o5[:\s]*(\d+\.?\d*)/i
  ];
  
  for (const pattern of phosphorusPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.phosphorus = parseFloat(match[1]);
      matchCount++;
      break;
    }
  }

  // Extract Potassium (K)
  const potassiumPatterns = [
    /potassium[:\s]*(\d+\.?\d*)/i,
    /\bk[:\s]*(\d+\.?\d*)/i,
    /available\s+potassium[:\s]*(\d+\.?\d*)/i,
    /k\s*\(kg\/ha\)[:\s]*(\d+\.?\d*)/i,
    /k2o[:\s]*(\d+\.?\d*)/i
  ];
  
  for (const pattern of potassiumPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.potassium = parseFloat(match[1]);
      matchCount++;
      break;
    }
  }

  // Extract pH
  const phPatterns = [
    /ph[:\s]*(\d+\.?\d*)/i,
    /ph\s+value[:\s]*(\d+\.?\d*)/i,
    /soil\s+ph[:\s]*(\d+\.?\d*)/i
  ];
  
  for (const pattern of phPatterns) {
    const match = text.match(pattern);
    if (match) {
      const phValue = parseFloat(match[1]);
      // pH should be between 3 and 10 for soil
      if (phValue >= 3 && phValue <= 10) {
        result.pH = phValue;
        matchCount++;
      }
      break;
    }
  }

  // Extract Organic Carbon
  const organicCarbonPatterns = [
    /organic\s+carbon[:\s]*(\d+\.?\d*)/i,
    /o\.?c\.?[:\s]*(\d+\.?\d*)/i,
    /oc[:\s]*(\d+\.?\d*)%?/i
  ];
  
  for (const pattern of organicCarbonPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.organicCarbon = parseFloat(match[1]);
      matchCount++;
      break;
    }
  }

  // Extract Soil Type
  const soilTypes = ['sandy', 'loamy', 'clayey', 'silty', 'clay', 'loam', 'sand', 'silt'];
  for (const type of soilTypes) {
    if (normalizedText.includes(type)) {
      // Normalize to our standard types
      if (type.includes('sand')) result.soilType = 'sandy';
      else if (type.includes('loam')) result.soilType = 'loamy';
      else if (type.includes('clay')) result.soilType = 'clayey';
      else if (type.includes('silt')) result.soilType = 'silty';
      matchCount++;
      break;
    }
  }

  // Extract Card Number (format: SHC-XXXXX or variations)
  const cardNumberPatterns = [
    /shc[:\s#-]*([a-z0-9\-\/]+)/i,
    /card\s+no\.?[:\s]*([a-z0-9\-\/]+)/i,
    /soil\s+health\s+card[:\s#]*([a-z0-9\-\/]+)/i
  ];
  
  for (const pattern of cardNumberPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.cardNumber = match[1].trim();
      break;
    }
  }

  // Extract Location
  const locationPatterns = [
    /village[:\s]*([a-z\s]+)/i,
    /district[:\s]*([a-z\s]+)/i,
    /location[:\s]*([a-z\s]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.location = match[1].trim();
      break;
    }
  }

  // Calculate confidence based on how many fields we extracted
  result.confidence = matchCount / 5; // 5 main fields: N, P, K, pH, OC

  return result;
}
