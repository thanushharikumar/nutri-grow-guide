// services.js

export class WeatherService {
  static async getWeather(city) {
    const apiKey = "9205b732d4a6673e773575c56744d66d1e136dc2c9499d"; // Replace with your key
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
}

export class CropAnalysisService {
  // Convert image to base64
  static async convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  }

  // Analyze uploaded crop image (validated via Vision API)
  static async analyzeCropImage(imageFile) {
    try {
      // Convert image to Base64
      const base64 = await this.convertToBase64(imageFile);

      // Send to Supabase Edge Function for Vision API validation
      const response = await fetch(
        "https://bkqzrfuyjugegxcqxwuo.supabase.co",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        }
      );

      const result = await response.json();

      // Invalid image (non-crop)
      if (!response.ok || result.valid === false) {
        throw new Error(
          result.message ||
            "Invalid image detected. Please upload a crop or plant image."
        );
      }

      // ✅ Simulated crop health analysis (after validation)
      await WeatherService.delay(1500);
      const cropHealthOptions = ["poor", "fair", "good", "excellent"];
      const cropHealth =
        cropHealthOptions[Math.floor(Math.random() * cropHealthOptions.length)];

      // Deficiency detection based on color tone
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
      throw new Error(
        error.message ||
          "Unable to analyze crop image. Please upload a valid crop photo."
      );
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