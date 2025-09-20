-- Create weather data table
CREATE TABLE public.weather_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  temperature DECIMAL(5, 2) NOT NULL,
  humidity INTEGER NOT NULL,
  rainfall DECIMAL(8, 2) NOT NULL DEFAULT 0,
  wind_speed DECIMAL(6, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create soil health data table  
CREATE TABLE public.soil_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  soil_type TEXT NOT NULL CHECK (soil_type IN ('sandy', 'loamy', 'clayey', 'silty')),
  ph DECIMAL(4, 2) NOT NULL CHECK (ph >= 0 AND ph <= 14),
  nitrogen DECIMAL(8, 2) NOT NULL DEFAULT 0,
  phosphorus DECIMAL(8, 2) NOT NULL DEFAULT 0,
  potassium DECIMAL(8, 2) NOT NULL DEFAULT 0,
  organic_carbon DECIMAL(5, 2) NOT NULL DEFAULT 0,
  electrical_conductivity DECIMAL(6, 3),
  region TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crop analysis results table
CREATE TABLE public.crop_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,
  crop_health TEXT NOT NULL CHECK (crop_health IN ('excellent', 'good', 'fair', 'poor')),
  deficiencies JSONB NOT NULL DEFAULT '[]',
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  confidence DECIMAL(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comprehensive recommendations table (extend existing)
CREATE TABLE public.fertilizer_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_type TEXT NOT NULL,
  soil_data JSONB NOT NULL,
  weather_data JSONB NOT NULL,
  crop_analysis_id UUID REFERENCES public.crop_analysis(id),
  nitrogen_recommendation DECIMAL(8, 2) NOT NULL,
  phosphorus_recommendation DECIMAL(8, 2) NOT NULL,
  potassium_recommendation DECIMAL(8, 2) NOT NULL,
  products JSONB NOT NULL DEFAULT '[]',
  application_schedule JSONB NOT NULL DEFAULT '[]',
  sustainability_score INTEGER NOT NULL CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
  expected_yield_increase DECIMAL(5, 2) NOT NULL,
  cost_estimate DECIMAL(10, 2) NOT NULL,
  weather_considerations TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_weather_data_location ON public.weather_data(latitude, longitude);
CREATE INDEX idx_weather_data_recorded_at ON public.weather_data(recorded_at);
CREATE INDEX idx_soil_health_location ON public.soil_health(latitude, longitude);
CREATE INDEX idx_soil_health_region ON public.soil_health(region);
CREATE INDEX idx_crop_analysis_date ON public.crop_analysis(analysis_date);
CREATE INDEX idx_fertilizer_recommendations_crop ON public.fertilizer_recommendations(crop_type);
CREATE INDEX idx_fertilizer_recommendations_created_at ON public.fertilizer_recommendations(created_at);

-- Enable Row Level Security
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertilizer_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (agricultural data should be accessible)
CREATE POLICY "Weather data is publicly readable" 
ON public.weather_data FOR SELECT 
USING (true);

CREATE POLICY "Soil health data is publicly readable" 
ON public.soil_health FOR SELECT 
USING (true);

CREATE POLICY "Crop analysis is publicly readable" 
ON public.crop_analysis FOR SELECT 
USING (true);

CREATE POLICY "Fertilizer recommendations are publicly readable" 
ON public.fertilizer_recommendations FOR SELECT 
USING (true);

-- Allow public insert for data collection
CREATE POLICY "Allow public weather data insertion" 
ON public.weather_data FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public soil health data insertion" 
ON public.soil_health FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public crop analysis insertion" 
ON public.crop_analysis FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public fertilizer recommendations insertion" 
ON public.fertilizer_recommendations FOR INSERT 
WITH CHECK (true);

-- Insert sample fertilizer rules data
INSERT INTO public.fertilizer_rules (crop, n_min, p_min, k_min, recommendation) VALUES
('rice', 120, 60, 40, 'Rice requires balanced NPK with emphasis on nitrogen during vegetative growth'),
('wheat', 150, 80, 60, 'Wheat needs higher nitrogen for protein development and moderate P-K levels'),
('maize', 180, 90, 70, 'Maize is a heavy feeder requiring high NPK levels throughout the growth cycle'),
('millets', 60, 40, 30, 'Millets are drought-resistant crops requiring moderate fertilization'),
('cotton', 200, 100, 80, 'Cotton requires high NPK levels with potassium crucial for fiber quality'),
('sugarcane', 250, 120, 100, 'Sugarcane is a long-duration crop needing sustained nutrient supply'),
('soybean', 80, 60, 70, 'Soybean fixes nitrogen but needs phosphorus and potassium for optimal yield');

-- Insert sample soil health data for different regions
INSERT INTO public.soil_health (latitude, longitude, soil_type, ph, nitrogen, phosphorus, potassium, organic_carbon, region) VALUES
(28.6139, 77.2090, 'loamy', 7.2, 280, 45, 180, 1.8, 'North India'),
(19.0760, 72.8777, 'clayey', 6.8, 320, 38, 160, 1.2, 'West India'),
(13.0827, 80.2707, 'sandy', 6.5, 180, 28, 120, 0.8, 'South India'),
(22.5726, 88.3639, 'silty', 7.0, 250, 42, 200, 1.5, 'East India'),
(23.0225, 72.5714, 'loamy', 7.5, 300, 48, 190, 1.9, 'Gujarat'),
(15.3173, 75.7139, 'clayey', 6.2, 220, 35, 140, 1.1, 'Karnataka'),
(26.9124, 75.7873, 'sandy', 8.1, 160, 25, 110, 0.7, 'Rajasthan');