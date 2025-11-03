// src/services/index.js
import { WeatherService } from "./weatherService.ts";
import { SoilHealthService } from "./SoilHealthService.js";
import { CropAnalysisService } from "./cropAnalysisService.ts";
import { FertilizerService } from "./recommendationEngine.ts"; 

export {
  WeatherService,
  SoilHealthService,
  CropAnalysisService,
  FertilizerService,
};
