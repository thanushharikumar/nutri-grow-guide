# 🌾 Sustainable Fertilizer Usage Optimizer

AI-powered platform for soil health analysis and crop nutrient deficiency detection.

## 🚀 Features

- **Soil Health Analysis**: Real-time soil data from Soil Health Card (SHC) database
- **GPS Location Detection**: Automatic location-based soil data retrieval
- **AI Crop Analysis**: Advanced image processing for nutrient deficiency detection
  - Nitrogen deficiency detection
  - Phosphorus deficiency detection
  - Potassium deficiency detection
- **Smart Recommendations**: Fertilizer application suggestions based on AI analysis

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase
- **Image Processing**: Vision API for pixel-level analysis
- **Geolocation**: Open Weather Map API

## 📦 Installation
```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## 📱 Core Services

### Soil Health Service
Fetches soil data based on GPS coordinates from SHC database.

**Returns:**
- Soil Type
- pH Level
- Nitrogen (ppm)
- Phosphorus (ppm)
- Potassium (ppm)
- Organic Carbon (%)
- SHC Card Number

### Crop Analysis Service
AI-powered image analysis detecting:
- Color patterns indicating nutrient deficiencies
- Crop health status (excellent/good/fair/poor)
- Confidence scores and recommendations

## 🎨 Project Structure
```
src/
├── components/           # React components
├── services/            # API services
│   ├── SoilHealthService.js
│   ├── CropAnalysisService.js
│   ├── WeatherService.js
│   ├── FertilizerService.js
│   └── index.js
├── integrations/        # Supabase integration
├── App.tsx             # Main app component
└── main.tsx            # Application entry point
```

## 📖 API Documentation

### Soil Health API
```typescript
getSoilHealthData(coordinates: {lat: number, lon: number}): Promise<SoilData>

Response:
{
  soilType: string,
  pH: number,
  nitrogen: number,
  phosphorus: number,
  potassium: number,
  organicCarbon: number,
  cardNumber: string
}
```

### Crop Analysis API
```typescript
analyzeCropImage(imageFile: File): Promise<CropAnalysisResult>

Response:
{
  cropHealth: 'excellent' | 'good' | 'fair' | 'poor',
  deficiencies: Array<{
    nutrient: string,
    severity: 'low' | 'moderate' | 'high',
    confidence: number,
    symptoms: string[]
  }>,
  recommendations: string[],
  confidence: number
}
```


### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Custom Server
```bash
npm run build
# Serve the dist/ folder with any static hosting
```

## 🚀 Usage

1. **Get Soil Analysis**
   - Click "Fetch from SHC" button
   - Allow location access when prompted
   - View soil parameters and card number

2. **Analyze Crop Image**
   - Click "Upload Crop Image"
   - Select a clear image of your crop
   - Wait for AI analysis
   - View detected deficiencies and recommendations

## 🔒 Security

- Environment variables are used for sensitive data
- No API keys are exposed in the frontend
- Image processing is done client-side for privacy

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

THANUSH H
- GitHub:https://thanushharikumar.github.io
- Email: thanush.hkumar@gmail.com

## 🙏 Acknowledgments

- Soil Health Card (SHC) Database Initiative
- Agricultural research community
- Open-source contributors

---

