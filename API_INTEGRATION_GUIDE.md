# 🔌 Complete API Integration Guide

## Overview
This project integrates **6 major APIs/services** that work together to provide comprehensive fertilizer recommendations. Here's how they all connect and work in harmony.

---

## 📋 All Integrated APIs

### 1. **Browser Geolocation API** (Native Browser)
### 2. **SoilGrids API** (ISRIC - Global Soil Database)
### 3. **Google Vision API** (OCR & Image Validation)
### 4. **Kindwise Crop.health API** (Crop Image Validation)
### 5. **OpenWeatherMap API** (Weather Data)
### 6. **Supabase** (Backend as a Service)

---

## 🔄 Complete Data Flow: How All APIs Work Together

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: SOIL DATA COLLECTION                                   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  Option A: GPS-Based (Automatic)                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Browser Geolocation API                              │    │
│  │    → Gets GPS coordinates (lat, lon)                    │    │
│  │                                                          │    │
│  │ 2. SoilGrids API (ISRIC)                                │    │
│  │    URL: https://rest.isric.org/soilgrids/v2.0/...      │    │
│  │    → Fetches: Nitrogen, pH, Organic Carbon,           │    │
│  │      Clay %, Sand % (0-5cm depth)                      │    │
│  │    → Determines: Soil Type (sandy/loamy/clayey/silty)  │    │
│  │    → Returns: Real-time global soil data               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Option B: Soil Health Card Upload (Manual)                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. User uploads SHC image                               │    │
│  │                                                          │    │
│  │ 2. Supabase Edge Function: extract-soil-health-card    │    │
│  │    → Receives: Base64 image                            │    │
│  │                                                          │    │
│  │ 3. Google Vision API                                     │    │
│  │    URL: https://vision.googleapis.com/v1/...           │    │
│  │    Features: TEXT_DETECTION, DOCUMENT_TEXT_DETECTION    │    │
│  │    → Extracts: All text from SHC image                 │    │
│  │                                                          │    │
│  │ 4. Regex Pattern Matching                               │    │
│  │    → Parses: N, P, K, pH, Organic Carbon,              │    │
│  │      Soil Type, Card Number, Location                  │    │
│  │    → Returns: Structured soil data                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: CROP IMAGE ANALYSIS (Optional)                         │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1. User uploads crop image                               │  │
│  │                                                          │  │
│  │ 2. Supabase Edge Function: validate-crop-image          │  │
│  │    → Receives: Base64 image                             │  │
│  │                                                          │  │
│  │ 3. Kindwise Crop.health API                             │  │
│  │    URL: https://crop.kindwise.com/api/v1/identification │  │
│  │    → Validates: Is this a plant/crop image?             │  │
│  │    → Identifies: Crop type, scientific name             │  │
│  │    → Returns: Validation result + crop suggestions      │  │
│  │                                                          │  │
│  │ 4. Client-Side Pixel Analysis (if validated)            │  │
│  │    → Analyzes: RGB color patterns                       │  │
│  │    → Detects: Nitrogen (yellowish),                     │  │
│  │                Phosphorus (dark/purple),               │  │
│  │                Potassium (pale) deficiencies           │  │
│  │    → Calculates: Health score, confidence              │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: WEATHER DATA FETCHING                                   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1. Supabase Edge Function: get-weather                  │  │
│  │    → Receives: GPS coordinates (lat, lon)               │  │
│  │                                                          │  │
│  │ 2. Database Cache Check                                 │  │
│  │    → Checks: weather_data table (last 1 hour)           │  │
│  │    → If cached: Returns cached data                     │  │
│  │                                                          │  │
│  │ 3. OpenWeatherMap API (if not cached)                   │  │
│  │    Current: https://api.openweathermap.org/data/2.5/    │  │
│  │             weather?lat={lat}&lon={lon}                 │  │
│  │    Forecast: https://api.openweathermap.org/data/2.5/   │  │
│  │             forecast?lat={lat}&lon={lon}                │  │
│  │    → Fetches: Temperature, Humidity, Wind Speed,         │  │
│  │                Rainfall (3h forecast), Description      │  │
│  │                                                          │  │
│  │ 4. Store in Supabase Database                           │  │
│  │    → Caches: weather_data table for future requests     │  │
│  │    → Returns: Processed weather data                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: RECOMMENDATION GENERATION                               │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1. Supabase Edge Function: generate-recommendation       │  │
│  │    → Receives:                                           │  │
│  │      • Crop Type                                         │  │
│  │      • Soil Data (from Step 1)                           │  │
│  │      • Weather Data (from Step 3)                         │  │
│  │      • Crop Analysis (from Step 2, optional)             │  │
│  │                                                          │  │
│  │ 2. Supabase Database Query                               │  │
│  │    → Fetches: fertilizer_rules table                     │  │
│  │    → Gets: Base N, P, K requirements for crop type       │  │
│  │                                                          │  │
│  │ 3. ML Algorithm Processing                               │  │
│  │    → Calculates:                                         │  │
│  │      • pH adjustments (affects nutrient availability)   │  │
│  │      • Soil type adjustments (sandy/loamy/clayey/silty)  │  │
│  │      • Existing nutrient adjustments                    │  │
│  │      • Weather adjustments (rainfall, temperature)       │  │
│  │      • Crop health adjustments (from image analysis)     │  │
│  │                                                          │  │
│  │ 4. Generate Recommendations                             │  │
│  │    → Products: Urea, DAP, MOP, Organic                 │  │
│  │    → Quantities: kg/ha for each nutrient                 │  │
│  │    → Schedule: Application timing by growth stage       │  │
│  │    → Weather Considerations: Timing recommendations     │  │
│  │    → Sustainability Score: 0-100% calculation          │  │
│  │                                                          │  │
│  │ 5. Store in Supabase Database                            │  │
│  │    → Tables: fertilizer_recommendations,               │  │
│  │                recommendation_logs                      │  │
│  │    → Returns: Complete recommendation object            │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESULTS DISPLAYED TO USER                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detailed API Breakdown

### 1. **Browser Geolocation API** (Native)
**Purpose**: Get user's GPS coordinates

**How it works**:
```typescript
// Location: src/services/weatherService.ts
navigator.geolocation.getCurrentPosition()
  → Returns: { lat: number, lon: number }
```

**Used in**:
- Soil data fetching (GPS-based)
- Weather data fetching
- Recommendation generation (location context)

**Fallback**: Defaults to New Delhi (28.6139°N, 77.2090°E) if permission denied

---

### 2. **SoilGrids API** (ISRIC - International Soil Reference)
**Purpose**: Get real-time global soil property data

**Endpoint**:
```
GET https://rest.isric.org/soilgrids/v2.0/properties/query
  ?lat={latitude}
  &lon={longitude}
  &property=nitrogen,phh2o,ocd,clay,sand
  &depth=0-5cm
  &value=mean
```

**Returns**:
- Nitrogen (cg/kg) → converted to kg/ha
- pH (pH * 10) → divided by 10
- Organic Carbon (dg/kg) → converted to %
- Clay % → determines soil type
- Sand % → determines soil type

**Location**: `src/services/SoilGridsService.ts`

**Data Processing**:
```typescript
SoilGridsService.getSoilData(lat, lon)
  → Fetches raw data
  → Maps to standardized format
  → Determines soil type (sandy/loamy/clayey/silty)
  → Returns: { nitrogen, phosphorus, potassium, pH, organicCarbon, soilType }
```

**Fallback**: Uses regional mock data if API fails

---

### 3. **Google Vision API** (OCR)
**Purpose**: Extract text from Soil Health Card images

**Endpoint**:
```
POST https://vision.googleapis.com/v1/images:annotate?key={API_KEY}
```

**Request Body**:
```json
{
  "requests": [{
    "image": { "content": "base64_encoded_image" },
    "features": [
      { "type": "TEXT_DETECTION", "maxResults": 1 },
      { "type": "DOCUMENT_TEXT_DETECTION", "maxResults": 1 }
    ]
  }]
}
```

**Location**: `supabase/functions/extract-soil-health-card/index.ts`

**Processing Flow**:
1. Receives base64 image from frontend
2. Calls Google Vision API
3. Gets full text annotation
4. Uses regex patterns to extract:
   - Nitrogen (N)
   - Phosphorus (P)
   - Potassium (K)
   - pH value
   - Organic Carbon (OC)
   - Soil Type
   - Card Number
   - Location
5. Returns structured data with confidence score

**Pattern Examples**:
- Nitrogen: `/nitrogen[:\s]*(\d+\.?\d*)/i`
- pH: `/ph[:\s]*(\d+\.?\d*)/i`
- Organic Carbon: `/organic\s+carbon[:\s]*(\d+\.?\d*)/i`

---

### 4. **Kindwise Crop.health API** (Image Validation)
**Purpose**: Validate that uploaded image contains a crop/plant

**Endpoint**:
```
POST https://crop.kindwise.com/api/v1/identification
Headers: {
  "Content-Type": "application/json",
  "Api-Key": "{KINDWISE_API_KEY}"
}
Body: {
  "images": ["base64_image"],
  "similar_images": true
}
```

**Location**: `supabase/functions/validate-crop-image/index.ts`

**Validation Logic**:
1. Checks `result.is_plant.binary` → Must be true
2. Checks `result.crop.suggestions[0].probability` → Must be > 0.15
3. Returns validation result with:
   - `valid`: boolean
   - `confidence`: probability score
   - `crop`: identified crop name
   - `scientificName`: scientific name
   - `suggestions`: top 3 crop matches

**If validation fails**: User cannot proceed with analysis

---

### 5. **OpenWeatherMap API** (Weather Data)
**Purpose**: Get current weather and forecast for location

**Endpoints**:
```
# Current Weather
GET https://api.openweathermap.org/data/2.5/weather
  ?lat={latitude}
  &lon={longitude}
  &appid={API_KEY}
  &units=metric

# Forecast (for rainfall)
GET https://api.openweathermap.org/data/2.5/forecast
  ?lat={latitude}
  &lon={longitude}
  &appid={API_KEY}
  &units=metric
```

**Location**: `supabase/functions/get-weather/index.ts`

**Data Retrieved**:
- Temperature (°C)
- Humidity (%)
- Wind Speed (km/h, converted from m/s)
- Rainfall (mm, from 3h forecast)
- Description (weather condition)
- Location (city, country)

**Caching Strategy**:
- Checks Supabase `weather_data` table
- If data exists within last 1 hour → returns cached
- Otherwise → fetches fresh data → stores in database

**Used For**:
- Fertilizer application timing
- Weather considerations in recommendations
- Sustainability score calculation

---

### 6. **Supabase** (Backend as a Service)
**Purpose**: Complete backend infrastructure

**Services Used**:

#### A. **PostgreSQL Database**
**Tables**:
- `crop_analysis` - Stores crop image analysis results
- `soil_health_data` - Stores soil analysis data
- `fertilizer_recommendations` - Stores generated recommendations
- `recommendation_logs` - Historical recommendation logs
- `fertilizer_rules` - Base nutrient requirements per crop
- `weather_data` - Cached weather data
- `users` - User authentication data

#### B. **Edge Functions** (Deno Runtime)
**Functions**:
1. `generate-recommendation` - Main ML recommendation engine
2. `extract-soil-health-card` - OCR extraction
3. `validate-crop-image` - Image validation
4. `get-weather` - Weather data fetching
5. `getFertilizerRecommendation` - Alternative recommendation endpoint
6. `ml-prediction` - ML prediction service

#### C. **Authentication**
- Supabase Auth
- Protected routes
- User session management

---

## 🔗 API Interaction Examples

### Example 1: Complete Flow (GPS + Image Upload)

```typescript
// 1. Get Location
const coords = await getUserLocation(); // Browser Geolocation API
// Returns: { lat: 28.6139, lon: 77.2090 }

// 2. Get Soil Data
const soilData = await getSoilHealthData(coords);
// → Calls: SoilGrids API
// → Returns: { nitrogen: 200, phosphorus: 15, potassium: 150, pH: 6.5, ... }

// 3. Validate Crop Image
const validation = await supabase.functions.invoke('validate-crop-image', {
  body: { image: base64Image }
});
// → Calls: Kindwise Crop.health API
// → Returns: { valid: true, crop: "Rice", confidence: 0.85 }

// 4. Analyze Crop Image (if validated)
const cropAnalysis = await analyzeCropImage(imageFile);
// → Client-side pixel analysis
// → Returns: { cropHealth: "good", deficiencies: [...], ... }

// 5. Get Weather
const weather = await getWeatherData(coords);
// → Calls: OpenWeatherMap API (via Supabase Edge Function)
// → Returns: { temperature: 28, humidity: 65, rainfall: 2.5, ... }

// 6. Generate Recommendation
const recommendation = await callRecommendationApi({
  cropType: "rice",
  soilData,
  weatherData: weather,
  cropAnalysis
});
// → Calls: Supabase Edge Function (generate-recommendation)
// → Queries: Supabase Database (fertilizer_rules)
// → Returns: Complete recommendation with products, schedule, sustainability score
```

### Example 2: Soil Health Card Upload Flow

```typescript
// 1. User uploads SHC image
const file = event.target.files[0];

// 2. Convert to base64
const base64 = await convertToBase64(file);

// 3. Extract data via OCR
const { data } = await supabase.functions.invoke('extract-soil-health-card', {
  body: { image: base64 }
});
// → Calls: Google Vision API
// → Extracts: N, P, K, pH, OC, Soil Type
// → Returns: { success: true, extractedData: {...} }

// 4. Auto-populate form
form.setValue('nitrogen', extractedData.nitrogen);
form.setValue('phosphorus', extractedData.phosphorus);
// ... etc
```

---

## 🎯 API Configuration

### Environment Variables Required:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Vision API (for OCR)
GOOGLE_VISION_API_KEY=your-google-vision-key

# Kindwise API (for crop validation)
KINDWISE_API_KEY=your-kindwise-key

# OpenWeatherMap API
OPENWEATHER_API_KEY=your-openweather-key
```

### API Keys Location:
- **Frontend**: `.env` file (VITE_ prefixed)
- **Edge Functions**: Supabase Dashboard → Settings → Edge Functions → Secrets

---

## 📊 API Usage Statistics

### Request Flow:
1. **SoilGrids API**: 1 request per soil data fetch
2. **Google Vision API**: 1 request per SHC upload
3. **Kindwise API**: 1 request per crop image upload
4. **OpenWeatherMap API**: 1-2 requests per weather fetch (current + forecast)
5. **Supabase Database**: Multiple queries per recommendation

### Caching Strategy:
- **Weather Data**: Cached for 1 hour in database
- **Soil Data**: No caching (real-time required)
- **Recommendations**: Stored in database for history

---

## 🔒 Security & Best Practices

1. **API Keys**: Never exposed in frontend code
   - Google Vision, Kindwise, OpenWeatherMap → Edge Functions only
   - Supabase keys → Environment variables

2. **Input Validation**: All APIs validate input before calling
   - Zod schemas in Edge Functions
   - TypeScript types in frontend

3. **Error Handling**: Graceful fallbacks
   - SoilGrids fails → Mock data
   - Weather fails → Default location
   - Image validation fails → User feedback

4. **Rate Limiting**: 
   - Weather data cached to reduce API calls
   - Image validation prevents duplicate uploads

---

## 🚀 Performance Optimizations

1. **Parallel API Calls**: Where possible, APIs called in parallel
2. **Caching**: Weather data cached in database
3. **Image Compression**: Images compressed before upload
4. **Lazy Loading**: Edge functions loaded on demand
5. **Database Indexing**: Optimized queries on Supabase

---

## 📝 Summary: How APIs Work Together

1. **User provides location** → Browser Geolocation API
2. **System fetches soil data** → SoilGrids API (or OCR from SHC via Google Vision)
3. **User uploads crop image** → Kindwise API validates → Client-side analysis
4. **System fetches weather** → OpenWeatherMap API (cached in Supabase)
5. **All data combined** → Supabase Edge Function processes → ML algorithm
6. **Recommendation generated** → Stored in Supabase → Displayed to user

**Result**: A comprehensive, data-driven fertilizer recommendation combining:
- ✅ Real-time soil data
- ✅ Visual crop health analysis
- ✅ Current weather conditions
- ✅ Crop-specific requirements
- ✅ ML-powered optimization

---

This integration demonstrates:
- **Multiple API orchestration**
- **Real-time data processing**
- **AI/ML integration**
- **Efficient caching strategies**
- **Robust error handling**
- **Production-ready architecture**

