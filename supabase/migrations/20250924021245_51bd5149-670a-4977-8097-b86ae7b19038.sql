-- Create table for storing ML predictions
CREATE TABLE public.ml_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  input_data JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  model_version TEXT NOT NULL DEFAULT '1.0',
  confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a demo app)
CREATE POLICY "ML predictions are publicly readable" 
ON public.ml_predictions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public ML predictions insertion" 
ON public.ml_predictions 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_ml_predictions_created_at ON public.ml_predictions(created_at);
CREATE INDEX idx_ml_predictions_model_version ON public.ml_predictions(model_version);