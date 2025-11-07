-- Fix image_analysis_cache RLS policies
-- The table has RLS enabled but no policies, making it completely unusable

-- Allow public read access to cache (reduces API costs)
CREATE POLICY "Public can read image cache" 
ON public.image_analysis_cache 
FOR SELECT 
USING (true);

-- Allow public insert for caching results
CREATE POLICY "Public can insert to cache" 
ON public.image_analysis_cache 
FOR INSERT 
WITH CHECK (true);

-- Allow automatic cleanup of old cache entries (older than 7 days)
CREATE POLICY "Public can delete old cache" 
ON public.image_analysis_cache 
FOR DELETE 
USING (created_at < NOW() - INTERVAL '7 days');

-- Add index on image_hash for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_image_analysis_cache_hash 
ON public.image_analysis_cache(image_hash);

-- Add index on created_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_image_analysis_cache_created_at 
ON public.image_analysis_cache(created_at);