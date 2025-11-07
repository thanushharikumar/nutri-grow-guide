import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

// Input validation schema
const WeatherRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180)
});

interface WeatherRequest {
  lat: number;
  lon: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  description: string;
  location: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const body = await req.json();
    const validationResult = WeatherRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { lat, lon }: WeatherRequest = validationResult.data;
    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');

    if (!apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    // Check if we have recent weather data (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: cachedWeather } = await supabase
      .from('weather_data')
      .select('*')
      .gte('recorded_at', oneHourAgo)
      .eq('latitude', lat.toFixed(4))
      .eq('longitude', lon.toFixed(4))
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedWeather) {
      console.log('Returning cached weather data');
      return new Response(JSON.stringify({
        temperature: parseFloat(cachedWeather.temperature),
        humidity: cachedWeather.humidity,
        rainfall: parseFloat(cachedWeather.rainfall),
        windSpeed: parseFloat(cachedWeather.wind_speed),
        description: cachedWeather.description,
        location: cachedWeather.location
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch fresh weather data from OpenWeatherMap
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    
    // Also get forecast for rainfall data
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);
    let rainfall = 0;
    
    if (forecastResponse.ok) {
      const forecastData = await forecastResponse.json();
      // Get rainfall from next 3 hours
      if (forecastData.list && forecastData.list[0] && forecastData.list[0].rain) {
        rainfall = forecastData.list[0].rain['3h'] || 0;
      }
    }

    const processedWeatherData: WeatherData = {
      temperature: Math.round(weatherData.main.temp),
      humidity: weatherData.main.humidity,
      rainfall: rainfall,
      windSpeed: Math.round(weatherData.wind?.speed * 3.6 || 0), // Convert m/s to km/h
      description: weatherData.weather[0].description,
      location: `${weatherData.name}, ${weatherData.sys.country}`
    };

    // Store in database for caching
    const { error: insertError } = await supabase
      .from('weather_data')
      .insert({
        latitude: lat,
        longitude: lon,
        temperature: processedWeatherData.temperature,
        humidity: processedWeatherData.humidity,
        rainfall: processedWeatherData.rainfall,
        wind_speed: processedWeatherData.windSpeed,
        description: processedWeatherData.description,
        location: processedWeatherData.location,
        recorded_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing weather data:', insertError);
    }

    console.log('Fetched fresh weather data:', processedWeatherData);

    return new Response(JSON.stringify(processedWeatherData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in get-weather function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch weather data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);