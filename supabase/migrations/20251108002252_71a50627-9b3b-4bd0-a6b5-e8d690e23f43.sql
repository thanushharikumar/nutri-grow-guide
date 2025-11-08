-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add user_id columns to tables that need user ownership
ALTER TABLE public.crop_analysis ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.fertilizer_recommendations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ml_predictions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recommendation_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.soil_health ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for crop_analysis
DROP POLICY IF EXISTS "Crop analysis is publicly readable" ON public.crop_analysis;
DROP POLICY IF EXISTS "Allow public crop analysis insertion" ON public.crop_analysis;

CREATE POLICY "Users can view their own crop analysis"
  ON public.crop_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crop analysis"
  ON public.crop_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crop analysis"
  ON public.crop_analysis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crop analysis"
  ON public.crop_analysis FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for fertilizer_recommendations
DROP POLICY IF EXISTS "Fertilizer recommendations are publicly readable" ON public.fertilizer_recommendations;
DROP POLICY IF EXISTS "Allow public fertilizer recommendations insertion" ON public.fertilizer_recommendations;

CREATE POLICY "Users can view their own fertilizer recommendations"
  ON public.fertilizer_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fertilizer recommendations"
  ON public.fertilizer_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fertilizer recommendations"
  ON public.fertilizer_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fertilizer recommendations"
  ON public.fertilizer_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for ml_predictions
DROP POLICY IF EXISTS "ML predictions are publicly readable" ON public.ml_predictions;
DROP POLICY IF EXISTS "Allow public ML predictions insertion" ON public.ml_predictions;

CREATE POLICY "Users can view their own ML predictions"
  ON public.ml_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ML predictions"
  ON public.ml_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for recommendation_logs
DROP POLICY IF EXISTS "Recommendation logs are publicly readable" ON public.recommendation_logs;
DROP POLICY IF EXISTS "Allow public recommendation logs insertion" ON public.recommendation_logs;

CREATE POLICY "Users can view their own recommendation logs"
  ON public.recommendation_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendation logs"
  ON public.recommendation_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for soil_health
DROP POLICY IF EXISTS "Soil health data is publicly readable" ON public.soil_health;
DROP POLICY IF EXISTS "Allow public soil health data insertion" ON public.soil_health;

CREATE POLICY "Users can view their own soil health data"
  ON public.soil_health FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own soil health data"
  ON public.soil_health FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own soil health data"
  ON public.soil_health FOR UPDATE
  USING (auth.uid() = user_id);

-- Keep weather_data and fertilizer_rules publicly readable (reference data)
-- No changes needed for these tables

-- Add indexes for performance
CREATE INDEX idx_crop_analysis_user_id ON public.crop_analysis(user_id);
CREATE INDEX idx_fertilizer_recommendations_user_id ON public.fertilizer_recommendations(user_id);
CREATE INDEX idx_ml_predictions_user_id ON public.ml_predictions(user_id);
CREATE INDEX idx_recommendation_logs_user_id ON public.recommendation_logs(user_id);
CREATE INDEX idx_soil_health_user_id ON public.soil_health(user_id);