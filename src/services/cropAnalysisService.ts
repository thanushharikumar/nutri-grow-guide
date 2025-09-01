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
  // Simulate API processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock CNN analysis results based on random factors
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
  
  return {
    cropHealth: healthScore,
    deficiencies: mockDeficiencies,
    recommendations,
    confidence: 0.85 + Math.random() * 0.15
  };
};