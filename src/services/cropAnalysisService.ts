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

export const analyzeCropImage = async (imageFile: File): Promise<CropAnalysisResult> => {
  // Validate image is actually a crop/plant image
  const isValidCropImage = await validateCropImage(imageFile);
  if (!isValidCropImage) {
    throw new Error('Please upload a clear image of crops or plants. The uploaded image does not appear to contain agricultural content.');
  }

  // Simulate API processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock CNN analysis results based on image characteristics
  // In production, this would be a real ML model API call
  const mockDeficiencies: NutrientDeficiency[] = [];
  
  // Randomly generate deficiencies for demo
  const possibleDeficiencies = [
    {
      nutrient: 'nitrogen' as const,
      symptoms: ['Yellowing of lower leaves', 'Stunted growth', 'Reduced leaf size']
    },
    {
      nutrient: 'phosphorus' as const,
      symptoms: ['Purple/reddish leaf coloration', 'Delayed maturity', 'Poor root development']
    },
    {
      nutrient: 'potassium' as const,
      symptoms: ['Brown leaf edges', 'Weak stems', 'Poor fruit quality']
    },
    {
      nutrient: 'iron' as const,
      symptoms: ['Interveinal chlorosis', 'Young leaves turn yellow', 'Stunted growth']
    }
  ];
  
  // Randomly select 0-2 deficiencies
  const numDeficiencies = Math.floor(Math.random() * 3);
  for (let i = 0; i < numDeficiencies; i++) {
    const deficiency = possibleDeficiencies[Math.floor(Math.random() * possibleDeficiencies.length)];
    if (!mockDeficiencies.find(d => d.nutrient === deficiency.nutrient)) {
      mockDeficiencies.push({
        ...deficiency,
        severity: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)] as any,
        confidence: 0.7 + Math.random() * 0.3 // 70-100% confidence
      });
    }
  }
  
  const healthScore = mockDeficiencies.length === 0 ? 'excellent' : 
                     mockDeficiencies.length === 1 ? 'good' : 
                     mockDeficiencies.some(d => d.severity === 'high') ? 'poor' : 'fair';
  
  const recommendations = mockDeficiencies.length === 0 
    ? ['Continue current fertilization practices', 'Monitor crop regularly']
    : [
        'Apply targeted nutrient supplements',
        'Adjust fertilizer composition based on deficiencies',
        'Consider soil pH testing',
        'Implement precision agriculture techniques'
      ];

  const result: CropAnalysisResult = {
    cropHealth: healthScore,
    deficiencies: mockDeficiencies,
    recommendations,
    confidence: 0.85 + Math.random() * 0.15
  };

    // Store analysis result in database
    try {
      const { data, error } = await supabase
        .from('crop_analysis')
        .insert({
          crop_health: result.cropHealth,
          deficiencies: JSON.parse(JSON.stringify(result.deficiencies)),
          recommendations: result.recommendations,
          confidence: result.confidence
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing crop analysis:', error);
      } else {
        console.log('Stored crop analysis with ID:', data.id);
      }
    } catch (error) {
      console.error('Error storing crop analysis:', error);
    }
  
  return result;
};

// Validate if uploaded image contains crop/plant content using stricter criteria
const validateCropImage = async (imageFile: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // Stricter validation using multiple criteria
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) {
        resolve(false);
        return;
      }
      
      let greenPixels = 0;
      let strongGreenPixels = 0;
      let totalPixels = imageData.data.length / 4;
      let colorDiversity = new Set<string>();
      
      // Analyze pixel colors for vegetation patterns
      for (let i = 0; i < imageData.data.length; i += 4) {
        const red = imageData.data[i];
        const green = imageData.data[i + 1];
        const blue = imageData.data[i + 2];
        const alpha = imageData.data[i + 3];
        
        // Skip transparent pixels
        if (alpha < 128) continue;
        
        // Track color diversity (reduce false positives from solid color images)
        colorDiversity.add(`${Math.floor(red/10)}-${Math.floor(green/10)}-${Math.floor(blue/10)}`);
        
        // Check for green-dominant pixels (basic vegetation)
        if (green > red && green > blue && green > 50) {
          greenPixels++;
          
          // Check for strong vegetation signal (more confident)
          if (green > red + 20 && green > blue + 20 && green > 80) {
            strongGreenPixels++;
          }
        }
      }
      
      // Stricter requirements:
      // 1. At least 30% green pixels (up from 15%)
      // 2. At least 15% strong green pixels (high confidence vegetation)
      // 3. Sufficient color diversity (at least 50 different color groups to avoid solid colors)
      const greenPercentage = (greenPixels / totalPixels) * 100;
      const strongGreenPercentage = (strongGreenPixels / totalPixels) * 100;
      const hasDiversity = colorDiversity.size >= 50;
      
      const isValid = greenPercentage >= 30 && strongGreenPercentage >= 15 && hasDiversity;
      
      console.log('Image validation:', {
        greenPercentage: greenPercentage.toFixed(2),
        strongGreenPercentage: strongGreenPercentage.toFixed(2),
        colorDiversity: colorDiversity.size,
        isValid
      });
      
      resolve(isValid);
    };
    
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(imageFile);
  });
};