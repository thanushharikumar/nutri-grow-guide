import { supabase } from "@/integrations/supabase/client";

// Mock CNN analysis service for crop nutrient deficiency detection
export interface NutrientDeficiency {
  nutrient: 'nitrogen' | 'phosphorus' | 'potassium' | 'iron' | 'magnesium';
  severity: 'low' | 'moderate' | 'high';
  confidence: number;
  symptoms: string[];
}

export interface CropAnalysisResult {
  cropHealth: 'excellent' | 'good' | 'fair' | 'poor';
  deficiencies: NutrientDeficiency[];
  recommendations: string[];
  confidence: number;
}

interface ColorAnalysis {
  avgRed: number;
  avgGreen: number;
  avgBlue: number;
  yellowishPixels: number;
  darkPixels: number;
  palePixels: number;
}

/**
 * Analyze dominant colors in image to detect potential nutrient deficiencies
 */
const analyzeLeafColor = (data: Uint8ClampedArray): ColorAnalysis => {
  let totalRed = 0, totalGreen = 0, totalBlue = 0;
  let yellowishPixels = 0; // Nitrogen deficiency indicator
  let darkPixels = 0; // Phosphorus deficiency indicator
  let palePixels = 0; // Potassium deficiency indicator
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    totalRed += r;
    totalGreen += g;
    totalBlue += b;

    // Yellowish/pale leaves (low green, higher red) - Nitrogen deficiency
    if (g < 100 && r > 100 && b < 100) {
      yellowishPixels++;
    }
    
    // Dark/purple tint (high blue relative to green) - Phosphorus deficiency
    if (b > 120 && g < 100) {
      darkPixels++;
    }
    
    // Pale/washed out (high brightness, low saturation) - Potassium deficiency
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    if (brightness > 150 && saturation < 30) {
      palePixels++;
    }
  }

  return {
    avgRed: totalRed / totalPixels,
    avgGreen: totalGreen / totalPixels,
    avgBlue: totalBlue / totalPixels,
    yellowishPixels: (yellowishPixels / totalPixels) * 100,
    darkPixels: (darkPixels / totalPixels) * 100,
    palePixels: (palePixels / totalPixels) * 100,
  };
};

export const analyzeCropImage = async (imageFile: File): Promise<CropAnalysisResult> => {
  console.log('Starting AI-powered crop image analysis for:', imageFile.name);
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Failed to get canvas context');
          throw new Error('Unable to analyze image - canvas error');
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let greenPixels = 0;
        let strongGreenPixels = 0;
        const totalPixels = data.length / 4;
        const colorGroups = new Set<string>();
        
        // First pass: basic validation
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          colorGroups.add(`${Math.floor(r/50)}-${Math.floor(g/50)}-${Math.floor(b/50)}`);
          
          if (g > r && g > b && g > 50) {
            greenPixels++;
            if (g > 100 && g > r * 1.2 && g > b * 1.2) {
              strongGreenPixels++;
            }
          }
        }
        
        const greenPercentage = (greenPixels / totalPixels) * 100;
        const strongGreenPercentage = (strongGreenPixels / totalPixels) * 100;
        
        console.log(`Validation: ${greenPercentage.toFixed(2)}% green, ${strongGreenPercentage.toFixed(2)}% strong, ${colorGroups.size} colors`);
        
        // Strict validation
        if (greenPercentage < 30 || strongGreenPercentage < 15 || colorGroups.size < 50) {
          console.error('Image validation failed');
          throw new Error('Please upload a clear image of crops or plants. The uploaded image does not appear to contain adequate vegetation.');
        }
        
        // Perform color analysis for nutrient deficiency detection
        const colorAnalysis = analyzeLeafColor(data);
        console.log('Color analysis:', colorAnalysis);
        
        // Detect deficiencies based on color patterns
        const deficiencies: NutrientDeficiency[] = [];
        
        // Nitrogen deficiency (yellowish leaves)
        if (colorAnalysis.yellowishPixels > 10 || 
            (colorAnalysis.avgGreen < 80 && colorAnalysis.avgRed > 100)) {
          deficiencies.push({
            nutrient: 'nitrogen',
            severity: colorAnalysis.yellowishPixels > 20 ? 'high' : colorAnalysis.yellowishPixels > 15 ? 'moderate' : 'low',
            confidence: 0.75 + (colorAnalysis.yellowishPixels / 100),
            symptoms: ['Yellowing of lower leaves', 'Stunted growth', 'Pale leaf color']
          });
        }
        
        // Phosphorus deficiency (dark/purple tint)
        if (colorAnalysis.darkPixels > 8 || colorAnalysis.avgBlue > 120) {
          deficiencies.push({
            nutrient: 'phosphorus',
            severity: colorAnalysis.darkPixels > 15 ? 'high' : colorAnalysis.darkPixels > 10 ? 'moderate' : 'low',
            confidence: 0.70 + (colorAnalysis.darkPixels / 100),
            symptoms: ['Purple/reddish leaf coloration', 'Delayed maturity', 'Dark green/blue-ish leaves']
          });
        }
        
        // Potassium deficiency (pale/washed out)
        if (colorAnalysis.palePixels > 12 || 
            (strongGreenPercentage < 20 && greenPercentage > 30)) {
          deficiencies.push({
            nutrient: 'potassium',
            severity: colorAnalysis.palePixels > 20 ? 'high' : colorAnalysis.palePixels > 15 ? 'moderate' : 'low',
            confidence: 0.72 + (colorAnalysis.palePixels / 100),
            symptoms: ['Brown leaf edges', 'Weak stems', 'Pale, washed-out appearance']
          });
        }
        
        // Determine overall health
        let cropHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
        if (deficiencies.length === 0 && greenPercentage > 60 && strongGreenPercentage > 30) {
          cropHealth = 'excellent';
        } else if (deficiencies.length >= 2 || deficiencies.some(d => d.severity === 'high')) {
          cropHealth = 'poor';
        } else if (deficiencies.length === 1) {
          cropHealth = 'fair';
        }
        
        // Generate recommendations
        const recommendations: string[] = [];
        if (deficiencies.length === 0) {
          recommendations.push('Crop appears healthy. Continue current fertilization practices.');
          recommendations.push('Monitor crop regularly for any changes.');
        } else {
          deficiencies.forEach(def => {
            switch(def.nutrient) {
              case 'nitrogen':
                recommendations.push('Add Urea (46-0-0) or Ammonium Sulfate (21-0-0) - Apply 20-30 kg/ha');
                break;
              case 'phosphorus':
                recommendations.push('Apply DAP (18-46-0) or Single Super Phosphate - Apply 15-25 kg/ha P₂O₅');
                break;
              case 'potassium':
                recommendations.push('Add MOP (Muriate of Potash) or Sulphate of Potash - Apply 10-20 kg/ha K₂O');
                break;
            }
          });
          
          if (cropHealth === 'poor') {
            recommendations.push('⚠️ Soil testing strongly recommended');
            recommendations.push('Consider foliar spray for quick nutrient uptake');
          }
        }
        
        const result: CropAnalysisResult = {
          cropHealth,
          deficiencies,
          recommendations,
          confidence: 0.80 + (greenPercentage / 500) // 0.80-0.92 range
        };
        
        // Store in database
        supabase
          .from('crop_analysis')
          .insert({
            crop_health: result.cropHealth,
            deficiencies: JSON.parse(JSON.stringify(result.deficiencies)),
            recommendations: result.recommendations,
            confidence: result.confidence
          })
          .select()
          .single()
          .then(({ error }) => {
            if (error) console.error('DB storage error:', error);
          });
        
        resolve(result);
      };
      
      img.onerror = () => {
        throw new Error('Failed to load image file');
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      throw new Error('Failed to read image file');
    };
    
    reader.readAsDataURL(imageFile);
  });
};

// Validation is now integrated into analyzeCropImage