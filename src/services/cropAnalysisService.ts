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

// Validate if uploaded image contains crop/plant content
const validateCropImage = async (imageFile: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // Basic validation: check if image has green content (plants)
      // In production, this would use actual computer vision
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) {
        resolve(false);
        return;
      }
      
      let greenPixels = 0;
      let totalPixels = imageData.data.length / 4;
      
      // Count pixels that are more green than red/blue (simple vegetation detection)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const red = imageData.data[i];
        const green = imageData.data[i + 1];
        const blue = imageData.data[i + 2];
        
        // Check for green-dominant pixels (vegetation indicator)
        if (green > red && green > blue && green > 50) {
          greenPixels++;
        }
      }
      
      // Require at least 15% green pixels for crop images
      const greenPercentage = (greenPixels / totalPixels) * 100;
      resolve(greenPercentage >= 15);
    };
    
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(imageFile);
  });
};