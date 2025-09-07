// Services for the Sustainable Fertilizer Usage Optimizer

// Weather Service
class WeatherService {
  static async getWeatherData(coordinates = null) {
    try {
      // Mock weather data for demo - in production would use real API
      await this.delay(1000); // Simulate API call
      
      const mockData = {
        temperature: Math.round(20 + Math.random() * 15), // 20-35°C
        humidity: Math.round(40 + Math.random() * 40), // 40-80%
        rainfall: Math.round(Math.random() * 10), // 0-10mm
        windSpeed: Math.round(Math.random() * 15), // 0-15 km/h
        description: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
        location: coordinates ? 'Your Location' : 'Default Location'
      };
      
      return mockData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('Unable to fetch weather information');
    }
  }

  static async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          timeout: 10000,
          enableHighAccuracy: true
        }
      );
    });
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Soil Health Service
class SoilHealthService {
  static async getSoilHealthData(coordinates) {
    try {
      await WeatherService.delay(1500); // Simulate API call
      
      // Mock soil health card data
      const soilTypes = ['sandy', 'loamy', 'clayey', 'silty'];
      const randomSoilType = soilTypes[Math.floor(Math.random() * soilTypes.length)];
      
      const mockData = {
        cardNumber: `SHC${Math.floor(Math.random() * 900000) + 100000}`,
        farmerId: `F${Math.floor(Math.random() * 90000) + 10000}`,
        soilType: randomSoilType,
        pH: Math.round((5.5 + Math.random() * 3) * 10) / 10, // 5.5-8.5
        nitrogen: Math.round(80 + Math.random() * 200), // 80-280 ppm
        phosphorus: Math.round(15 + Math.random() * 40), // 15-55 ppm
        potassium: Math.round(90 + Math.random() * 150), // 90-240 ppm
        organicCarbon: Math.round((0.5 + Math.random() * 2.5) * 10) / 10, // 0.5-3.0%
        location: {
          lat: coordinates.lat,
          lon: coordinates.lon,
          district: 'Sample District',
          state: 'Sample State'
        },
        testDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      return mockData;
    } catch (error) {
      console.error('Error fetching soil data:', error);
      throw new Error('Unable to fetch soil health information');
    }
  }
}

// Crop Analysis Service
class CropAnalysisService {
  static async analyzeCropImage(imageFile) {
    try {
      await WeatherService.delay(2000); // Simulate AI processing time
      
      // Mock crop analysis result
      const cropHealthOptions = ['poor', 'fair', 'good', 'excellent'];
      const nutrientTypes = ['nitrogen', 'phosphorus', 'potassium', 'iron', 'magnesium', 'zinc'];
      const severityLevels = ['low', 'moderate', 'high'];
      
      const cropHealth = cropHealthOptions[Math.floor(Math.random() * cropHealthOptions.length)];
      const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence
      
      // Generate random deficiencies (0-3)
      const numDeficiencies = Math.floor(Math.random() * 4);
      const deficiencies = [];
      
      for (let i = 0; i < numDeficiencies; i++) {
        const nutrient = nutrientTypes[Math.floor(Math.random() * nutrientTypes.length)];
        const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
        
        // Avoid duplicate nutrients
        if (!deficiencies.some(d => d.nutrient === nutrient)) {
          deficiencies.push({
            nutrient,
            severity,
            confidence: 0.6 + Math.random() * 0.3,
            symptoms: this.getSymptoms(nutrient)
          });
        }
      }
      
      const recommendations = this.generateRecommendations(cropHealth, deficiencies);
      
      return {
        cropHealth,
        confidence,
        deficiencies,
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing crop image:', error);
      throw new Error('Unable to analyze crop image');
    }
  }

  static getSymptoms(nutrient) {
    const symptoms = {
      nitrogen: ['yellowing of older leaves', 'stunted growth', 'pale green color'],
      phosphorus: ['purple leaf coloration', 'delayed maturity', 'poor root development'],
      potassium: ['brown leaf edges', 'weak stems', 'reduced disease resistance'],
      iron: ['yellowing between leaf veins', 'pale new growth'],
      magnesium: ['interveinal chlorosis', 'leaf curling'],
      zinc: ['white stripes on leaves', 'shortened internodes']
    };
    
    return symptoms[nutrient] || ['general nutrient deficiency symptoms'];
  }

  static generateRecommendations(cropHealth, deficiencies) {
    const recommendations = [
      'Monitor crop regularly for changes',
      'Ensure adequate water supply'
    ];

    if (cropHealth === 'poor' || cropHealth === 'fair') {
      recommendations.push('Consider foliar application of nutrients');
      recommendations.push('Improve soil drainage if needed');
    }

    deficiencies.forEach(deficiency => {
      if (deficiency.severity === 'high') {
        recommendations.push(`Immediate ${deficiency.nutrient} supplementation required`);
      } else if (deficiency.severity === 'moderate') {
        recommendations.push(`Monitor and supplement ${deficiency.nutrient} as needed`);
      }
    });

    if (deficiencies.length === 0) {
      recommendations.push('Maintain current nutrient management practices');
    }

    return recommendations;
  }
}

// Recommendation Engine
class RecommendationEngine {
  static generateRecommendation(cropType, soilData, weatherData, cropAnalysis = null) {
    // Base fertilizer requirements by crop type
    const cropRequirements = {
      rice: { nitrogen: 120, phosphorus: 60, potassium: 40 },
      wheat: { nitrogen: 150, phosphorus: 80, potassium: 60 },
      maize: { nitrogen: 180, phosphorus: 90, potassium: 70 },
      millets: { nitrogen: 60, phosphorus: 40, potassium: 30 }
    };
    
    let baseRecommendation = cropRequirements[cropType.toLowerCase()] || cropRequirements.rice;
    
    // Adjust based on soil analysis
    const pHAdjustment = soilData.pH < 6.0 ? 1.1 : soilData.pH > 8.0 ? 0.9 : 1.0;
    const soilTypeAdjustment = {
      sandy: { n: 1.2, p: 1.1, k: 1.3 }, // Sandy soils need more nutrients
      loamy: { n: 1.0, p: 1.0, k: 1.0 }, // Ideal soil
      clayey: { n: 0.9, p: 1.2, k: 0.8 }, // Clay retains nutrients
      silty: { n: 1.0, p: 1.0, k: 1.1 }
    };
    
    const adjustment = soilTypeAdjustment[soilData.soilType];
    
    // Adjust for existing soil nutrients
    const nitrogenAdjustment = Math.max(0.3, 1 - (soilData.nitrogen / 300));
    const phosphorusAdjustment = Math.max(0.3, 1 - (soilData.phosphorus / 50));
    const potassiumAdjustment = Math.max(0.3, 1 - (soilData.potassium / 200));
    
    // Weather adjustments
    const rainfallAdjustment = weatherData.rainfall > 5 ? 1.1 : 0.95;
    const temperatureAdjustment = weatherData.temperature > 30 ? 1.05 : 1.0;
    
    // Crop analysis adjustments
    let cropHealthAdjustment = 1.0;
    if (cropAnalysis) {
      switch (cropAnalysis.cropHealth) {
        case 'poor': cropHealthAdjustment = 1.3; break;
        case 'fair': cropHealthAdjustment = 1.15; break;
        case 'good': cropHealthAdjustment = 1.0; break;
        case 'excellent': cropHealthAdjustment = 0.9; break;
      }
    }
    
    // Calculate final recommendation
    const finalRecommendation = {
      nitrogen: Math.round(baseRecommendation.nitrogen * 
                pHAdjustment * adjustment.n * nitrogenAdjustment * 
                rainfallAdjustment * temperatureAdjustment * cropHealthAdjustment),
      phosphorus: Math.round(baseRecommendation.phosphorus * 
                  pHAdjustment * adjustment.p * phosphorusAdjustment * temperatureAdjustment),
      potassium: Math.round(baseRecommendation.potassium * 
                 pHAdjustment * adjustment.k * potassiumAdjustment * temperatureAdjustment)
    };
    
    // Generate product recommendations
    const products = [
      {
        name: "Urea (46% N)",
        type: "urea",
        quantity: Math.round(finalRecommendation.nitrogen / 0.46),
        applicationTiming: "Split application - 50% at planting, 30% at tillering, 20% at flowering",
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
        applicationTiming: "50% at planting, 50% at flowering",
        method: "Broadcasting and incorporation"
      }
    ];
    
    // If organic carbon is low, add organic fertilizer
    if (soilData.organicCarbon < 1.0) {
      products.push({
        name: "Compost/FYM",
        type: "organic",
        quantity: 2500,
        applicationTiming: "2-3 weeks before planting",
        method: "Broadcasting and deep incorporation"
      });
    }
    
    // Generate application schedule
    const applicationSchedule = [
      {
        stage: "Land Preparation",
        daysAfterPlanting: -14,
        fertilizers: soilData.organicCarbon < 1.0 ? ["Compost/FYM", "Full P2O5", "50% K2O"] : ["Full P2O5", "50% K2O"],
        quantity: "As recommended",
        method: "Broadcasting and incorporation"
      },
      {
        stage: "Planting",
        daysAfterPlanting: 0,
        fertilizers: ["50% Nitrogen"],
        quantity: `${Math.round(finalRecommendation.nitrogen * 0.5)} kg N/ha`,
        method: "Band placement or starter fertilizer"
      },
      {
        stage: "Vegetative Growth",
        daysAfterPlanting: 30,
        fertilizers: ["30% Nitrogen"],
        quantity: `${Math.round(finalRecommendation.nitrogen * 0.3)} kg N/ha`,
        method: "Side dressing or foliar application"
      },
      {
        stage: "Reproductive Phase",
        daysAfterPlanting: 60,
        fertilizers: ["20% Nitrogen", "50% K2O"],
        quantity: `${Math.round(finalRecommendation.nitrogen * 0.2)} kg N/ha + ${Math.round(finalRecommendation.potassium * 0.5)} kg K2O/ha`,
        method: "Foliar spray or fertigation"
      }
    ];
    
    // Weather considerations
    const weatherConsiderations = [];
    if (weatherData.rainfall > 8) {
      weatherConsiderations.push("High rainfall expected - consider split applications to reduce nutrient loss");
    }
    if (weatherData.temperature > 32) {
      weatherConsiderations.push("High temperature - apply fertilizers early morning or late evening");
    }
    if (weatherData.humidity > 80) {
      weatherConsiderations.push("High humidity - ensure good ventilation for foliar applications");
    }
    if (weatherData.windSpeed > 10) {
      weatherConsiderations.push("High wind speed - avoid foliar applications");
    }
    
    // Calculate sustainability score (0-100)
    let sustainabilityScore = 60; // Base score
    
    // Organic matter bonus
    if (soilData.organicCarbon > 1.5) sustainabilityScore += 15;
    else if (soilData.organicCarbon > 1.0) sustainabilityScore += 10;
    
    // Precision application bonus
    sustainabilityScore += 10; // For using soil testing
    
    // Weather-responsive farming bonus
    sustainabilityScore += 10;
    
    // Reduce for high fertilizer use
    const totalNutrients = finalRecommendation.nitrogen + finalRecommendation.phosphorus + finalRecommendation.potassium;
    if (totalNutrients > 300) sustainabilityScore -= 10;
    
    // Crop health consideration
    if (cropAnalysis && cropAnalysis.cropHealth === 'excellent') sustainabilityScore += 5;
    
    sustainabilityScore = Math.min(100, Math.max(0, sustainabilityScore));
    
    // Estimate yield increase and cost
    const expectedYieldIncrease = Math.round(5 + (sustainabilityScore - 50) * 0.4); // 5-25% increase
    const costEstimate = Math.round(
      (finalRecommendation.nitrogen * 0.8) + 
      (finalRecommendation.phosphorus * 1.2) + 
      (finalRecommendation.potassium * 0.6) +
      (soilData.organicCarbon < 1.0 ? 50 : 0) // Organic matter cost
    );
    
    return {
      fertilizer: finalRecommendation,
      products,
      sustainabilityScore,
      applicationSchedule,
      weatherConsiderations,
      expectedYieldIncrease,
      costEstimate
    };
  }
}