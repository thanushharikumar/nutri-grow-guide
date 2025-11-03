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

/**
 * Validate crop image using Google Vision API via edge function
 */
const validateCropImage = async (imageFile: File): Promise<boolean> => {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        
        const response = await supabase.functions.invoke('validate-crop-image', {
          body: { image: base64 }
        });

        if (response.error) {
          console.error('Validation error:', response.error);
          reject(new Error(response.error.message || 'Failed to validate image'));
          return;
        }

        if (!response.data?.valid) {
          reject(new Error(response.data?.message || 'Invalid crop image'));
          return;
        }

        console.log('✅ Image validated by Google Vision API:', response.data);
        resolve(true);
      } catch (error: any) {
        console.error('Validation request failed:', error);
        reject(new Error('Failed to validate image'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(imageFile);
  });
};

export const analyzeCropImage = async (imageFile: File): Promise<CropAnalysisResult> => {
  console.log('Starting AI-powered crop image analysis for:', imageFile.name);

  // Immediate file validation
  if (!imageFile) {
    throw new Error('No image file provided');
  }

  // Validate file size (max 5MB)
  if (imageFile.size > 5 * 1024 * 1024) {
    throw new Error('Image file is too large. Please upload an image smaller than 5MB.');
  }

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/jpg'].includes(imageFile.type)) {
    throw new Error('Invalid file type. Please upload a JPEG or PNG image.');
  }

  // First, validate with Google Vision API
  console.log('🔍 Validating image with Google Vision API...');
  await validateCropImage(imageFile);
  console.log('✅ Image validated as crop/plant image');

  return new Promise((resolve, reject) => {

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
          reject(new Error('Unable to analyze image - canvas error'));
          return;
        }

        try {
          ctx.drawImage(img, 0, 0);
        } catch (error) {
          console.error('Failed to draw image to canvas:', error);
          reject(new Error('Unable to analyze image - drawing error'));
          return;
        }
        let imageData: ImageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (error) {
          console.error('Failed to get image data:', error);
          reject(new Error('Unable to analyze image - reading error'));
          return;
        }
        const data = imageData.data;
        const totalPixels = data.length / 4;
        const colorGroups = new Set<string>();
        
        // Enhanced validation logic with multiple checks
        let greenPixels = 0;
        let strongGreenPixels = 0;
        let bluePixels = 0;
        let uniformityCount = 0;
        let lastColor = '';
        let textureVariation = 0;
        let edgeCount = 0;
        
        // First pass: color analysis
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const colorGroup = `${Math.floor(r/30)}-${Math.floor(g/30)}-${Math.floor(b/30)}`;
          colorGroups.add(colorGroup);
          
          // Check for natural green colors (plant-like)
          if (g > r && g > b) {
            if (g > 50) {
              greenPixels++;
              // Strong green with natural variation
              if (g > 100 && g > r * 1.3 && g > b * 1.3 && r > 30) {
                strongGreenPixels++;
              }
            }
          }
          
          // Detect unnatural blue (sky/water)
          if (b > r * 1.5 && b > g * 1.2) {
            bluePixels++;
          }
          
          // Check color uniformity (detect artificial images)
          if (colorGroup === lastColor) {
            uniformityCount++;
          }
          lastColor = colorGroup;
          
          // Basic edge detection for texture
          if (i > 4 && i < data.length - 4) {
            const prevG = data[i-3];
            const nextG = data[i+5];
            if (Math.abs(g - prevG) > 20 || Math.abs(g - nextG) > 20) {
              edgeCount++;
              textureVariation += Math.abs(g - prevG);
            }
          }
        }
        
        const greenPercentage = (greenPixels / totalPixels) * 100;
        const strongGreenPercentage = (strongGreenPixels / totalPixels) * 100;
        const bluePercentage = (bluePixels / totalPixels) * 100;
        const uniformityPercentage = (uniformityCount / totalPixels) * 100;
        const textureScore = textureVariation / totalPixels;
        const edgePercentage = (edgeCount / totalPixels) * 100;
        
        console.log('Image analysis:', {
          greenPercentage: greenPercentage.toFixed(1) + '%',
          strongGreenPercentage: strongGreenPercentage.toFixed(1) + '%',
          bluePercentage: bluePercentage.toFixed(1) + '%',
          colorGroups: colorGroups.size,
          uniformityPercentage: uniformityPercentage.toFixed(1) + '%',
          textureScore: textureScore.toFixed(1),
          edgePercentage: edgePercentage.toFixed(1) + '%'
        });
        
        // Strict multi-factor validation
        const validationErrors = [];
        
        if (greenPercentage < 25) {
          validationErrors.push('insufficient green content');
        }
        if (strongGreenPercentage < 10) {
          validationErrors.push('lack of healthy plant coloration');
        }
        if (bluePercentage > 40) {
          validationErrors.push('too much sky/water content');
        }
        if (uniformityPercentage > 80) {
          validationErrors.push('suspiciously uniform coloring');
        }
        if (colorGroups.size < 100) {
          validationErrors.push('not enough color variation');
        }
        if (textureScore < 5) {
          validationErrors.push('insufficient leaf/plant texture');
        }
        if (edgePercentage < 10) {
          validationErrors.push('missing natural plant edges/details');
        }
        
        if (validationErrors.length > 0) {
          console.error('Image validation failed:', validationErrors);
          reject(new Error(
            `Please upload a clear image of crops or plants. Issues detected: ${validationErrors.join(', ')}.`
          ));
          return;
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
        reject(new Error('Failed to load image file'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(imageFile);
  });
};

// Validation is now integrated into analyzeCropImage