// services.js

export class WeatherService {
  static async getWeather(city) {
    const apiKey = "9205b732d4a6673e773575c56744d66d"; // Your OpenWeather API key
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
    );
    if (!response.ok) throw new Error("Failed to fetch weather data.");
    const data = await response.json();

    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      rainfall: data.rain ? data.rain["1h"] || 0 : 0,
      windSpeed: data.wind.speed,
      city: data.name,
      condition: data.weather[0].main,
    };
  }

  static async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  static async getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ Location detected:", position.coords);
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.error("❌ Location error:", error.message);
        reject(new Error("Location permission denied or unavailable."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}


}

export class CropAnalysisService {
  // Convert image to base64
  static async analyzeCropImage(imageFile) {
    try {
      // Convert image to Base64
      const base64 = await this.convertToBase64(imageFile);

      // ✅ Correct Edge Function Endpoint
      const response = await fetch(
        "https://bkqzrfuyjugegxcqxwuo.supabase.co/functions/v1/validate-crop-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcXpyZnV5anVnZWd4Y3F4d3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDUyNDgsImV4cCI6MjA3MzgyMTI0OH0.Nj4n7IvvZutma2w-0leJa78n9l03rngzuxt9MQS5N5A"
          },
          body: JSON.stringify({ image: base64 }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.valid === false) {
        throw new Error(
          result.message ||
            "Invalid image detected. Please upload a crop or plant image."
        );
      }

      // Simulated health analysis (you may replace with real logic from your ML model)
      await WeatherService.delay(1500);
      const cropHealthOptions = ["poor", "fair", "good", "excellent"];
      const cropHealth =
        cropHealthOptions[Math.floor(Math.random() * cropHealthOptions.length)];

      const deficiencies = [];
      if (cropHealth === "poor") deficiencies.push("Nitrogen deficiency");
      if (cropHealth === "fair") deficiencies.push("Mild potassium stress");

      return {
        cropHealth,
        confidence: result.confidence || 0.95,
        deficiencies,
        recommendations: [
          "Maintain balanced nutrient supply",
          "Ensure adequate irrigation and pest control",
        ],
      };
    } catch (error) {
      console.error("Error analyzing crop image:", error);
      throw error;
    }
  }

  static async convertToBase64(imageFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  }}

export class SoilHealthService {
  // Validation helpers
  static validateString(value, defaultValue) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return defaultValue;
  }

  static validateNumber(value, defaultValue, min, max) {
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) {
      if (min !== undefined && num < min) return defaultValue;
      if (max !== undefined && num > max) return defaultValue;
      return num;
    }
    return defaultValue;
  }
  static async getSoilHealthData(coordinates) {
    try {
      console.log('🌍 Fetching soil data for coordinates:', coordinates);
      
      // Validate coordinates
      if (!coordinates) {
        console.error('❌ No coordinates provided');
        throw new Error('No coordinates provided');
      }
      
      if (typeof coordinates.lat !== 'number' || typeof coordinates.lon !== 'number') {
        console.error('❌ Invalid coordinate format:', coordinates);
        throw new Error('Coordinates must be numbers');
      }
      
      if (coordinates.lat < -90 || coordinates.lat > 90 || coordinates.lon < -180 || coordinates.lon > 180) {
        console.error('❌ Coordinates out of range:', coordinates);
        throw new Error('Coordinates are outside valid range');
      }

      console.log('🔄 Making request to ml-prediction endpoint...');
      
      const response = await fetch(
        "https://bkqzrfuyjugegxcqxwuo.supabase.co/functions/v1/ml-prediction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcXpyZnV5anVnZWd4Y3F4d3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDUyNDgsImV4cCI6MjA3MzgyMTI0OH0.Nj4n7IvvZutma2w-0leJa78n9l03rngzuxt9MQS5N5A"
          },
          body: JSON.stringify({
            latitude: coordinates.lat,
            longitude: coordinates.lon,
            timestamp: new Date().toISOString()
          })
        }
      );

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.text();
          console.error('❌ Edge Function error details:', errorData);
          if (errorData) {
            try {
              const parsedError = JSON.parse(errorData);
              if (parsedError.message) {
                errorMessage = parsedError.message;
              }
            } catch (parseError) {
              console.warn('⚠️ Could not parse error response:', parseError);
            }
          }
        } catch (textError) {
          console.error('❌ Could not read error response:', textError);
        }
        throw new Error(`Failed to fetch soil health data: ${errorMessage}`);
      }

      let data;
      try {
        data = await response.json();
        console.log('📦 Raw response data:', data);
      } catch (jsonError) {
        console.error('❌ Invalid JSON response:', jsonError);
        throw new Error('Invalid response format from soil health service');
      }

      // Validate required fields
      if (!data || typeof data !== 'object') {
        console.error('❌ Missing or invalid response data');
        throw new Error('Invalid response from soil health service');
      }

      const soilData = {
        soilType: this.validateString(data.soilType, 'Sandy Loam'),
        pH: this.validateNumber(data.pH, 6.5, 0, 14),
        nitrogen: this.validateNumber(data.nitrogen, 150, 0, 1000),
        phosphorus: this.validateNumber(data.phosphorus, 25, 0, 500),
        potassium: this.validateNumber(data.potassium, 120, 0, 1000),
        organicCarbon: this.validateNumber(data.organicCarbon, 1.2, 0, 10),
        cardNumber: data.cardNumber || `SHC${Date.now().toString(36)}`
      };

      console.log('✅ Validated soil data:', soilData);
      return soilData;

      // Uncomment this when your API is ready
      /*
      const response = await fetch(
        "https://bkqzrfuyjugegxcqxwuo.supabase.co/functions/v1/soil-health",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcXpyZnV5anVnZWd4Y3F4d3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDUyNDgsImV4cCI6MjA3MzgyMTI0OH0.Nj4n7IvvZutma2w-0leJa78n9l03rngzuxt9MQS5N5A"
          },
          body: JSON.stringify({
            latitude: coordinates.lat,
            longitude: coordinates.lon
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch soil health data");
      }
      */

      const result = await response.json();
      console.log('📦 Received data:', result);
      
      // Format and validate the soil data
      return processedData;
      return soilData;
    } catch (error) {
      console.error("Error fetching soil health data:", error);
      throw new Error("Unable to connect to soil health database");
    }
  }
}

export class FertilizerService {
  // Send all data (soil, weather, image analysis) to backend
  static async getFertilizerRecommendation({
    cropType,
    soilData,
    weatherData,
    cropAnalysis,
  }) {
    try {
      const response = await fetch(
        "https://YOUR_SUPABASE_PROJECT_URL.functions.supabase.co/generate-recommendation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cropType,
            soilData,
            weatherData,
            cropAnalysis,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Recommendation failed");

      return result;
    } catch (error) {
      console.error("Error fetching fertilizer recommendation:", error);
      throw new Error(
        error.message || "Error connecting to the recommendation service."
      );
    }
  }
}

// Function to validate crop image before sending to recommendation
export async function validateCropImage(file) {
  // Convert image file to Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  try {
    const base64Image = await fileToBase64(file);

    // 🔗 Call Supabase Edge Function
    const response = await fetch(
      "https://bkqzrfuyjugegxcqxwuo.supabase.co/functions/v1/validate-crop-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.valid) {
      throw new Error(result.message || "Invalid crop image");
    }

    console.log("✅ Crop image validated:", result.labels);
    return result;
  } catch (error) {
    console.error("❌ Crop validation failed:", error.message);
    alert(error.message || "Failed to validate crop image");
    return { valid: false };
  }
}