-- Enable RLS on existing tables that don't have it
ALTER TABLE public.fertilizer_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for existing tables
CREATE POLICY "Fertilizer rules are publicly readable" 
ON public.fertilizer_rules FOR SELECT 
USING (true);

CREATE POLICY "Recommendation logs are publicly readable" 
ON public.recommendation_logs FOR SELECT 
USING (true);

CREATE POLICY "Allow public fertilizer rules insertion" 
ON public.fertilizer_rules FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public recommendation logs insertion" 
ON public.recommendation_logs FOR INSERT 
WITH CHECK (true);