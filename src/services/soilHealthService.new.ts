import { supabase } from "@/integrations/supabase/client";
import { mockSoilData } from './mockData';

export interface SoilHealthData {
  soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
  pH: number;
  nitrogen: number; // ppm
  phosphorus: number; // ppm
  potassium: number; // ppm
  organicCarbon: number; // %
  electricalConductivity?: number; // dS/m
  micronutrients?: {
    iron: number; // ppm
    manganese: number; // ppm
    zinc: number; // ppm
    copper: number; // ppm
  };
  location: {
    latitude: number;
    longitude: number;
  };
  lastUpdated: Date;
}

export async function getSoilHealthData(coordinates?: { lat: number; lon: number }): Promise<SoilHealthData> {
  try {
    // If coordinates are provided, try to get real data from the Edge Function
    if (coordinates) {
      console.log('🌱 Fetching real soil data for coordinates:', coordinates);
      
      const { data: realData, error } = await supabase.functions.invoke('getFertilizerRecommendation', {
        body: { 
          latitude: coordinates.lat,
          longitude: coordinates.lon
        }
      });

      if (!error && realData) {
        console.log('✅ Received real soil data:', realData);
        return {
          ...realData,
          location: {
            latitude: coordinates.lat,
            longitude: coordinates.lon
          },
          lastUpdated: new Date()
        } as SoilHealthData;
      }
      
      console.warn('⚠️ Failed to fetch real soil data, falling back to mock data:', error);
    }

    // Fallback to mock data if no coordinates or if the API call failed
    console.log('📍 Using mock data for North India region');
    const mockData = mockSoilData['North India'];
    return {
      ...mockData,
      location: coordinates 
        ? { latitude: coordinates.lat, longitude: coordinates.lon }
        : mockData.location,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('❌ Error fetching soil health data:', error);
    throw new Error('Failed to fetch soil health data');
  }
}

export async function uploadSoilHealthCard(file: File): Promise<SoilHealthData> {
  try {
    console.log('📄 Processing soil health card:', file.name);
    
    // First, upload the file to Supabase storage
    const fileName = `shc_${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('soil-health-cards')
      .upload(fileName, file);

    if (uploadError) {
      console.error('❌ File upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ File uploaded successfully:', fileName);

    // Get the public URL of the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('soil-health-cards')
      .getPublicUrl(fileName);

    console.log('🔍 Analyzing soil health card image...');
    
    // Call the Edge Function to process the soil health card
    const { data, error } = await supabase.functions.invoke('ml-prediction', {
      body: { imageUrl: publicUrl }
    });

    if (error) {
      console.error('❌ ML prediction error:', error);
      throw error;
    }
    
    if (!data) {
      console.error('❌ No data received from analysis');
      throw new Error('No data received from soil health card analysis');
    }

    console.log('✅ Soil health card analysis complete:', data);

    return {
      ...data,
      location: {
        latitude: data.latitude || mockSoilData['North India'].location.latitude,
        longitude: data.longitude || mockSoilData['North India'].location.longitude
      },
      lastUpdated: new Date()
    } as SoilHealthData;
  } catch (error) {
    console.error('❌ Error processing soil health card:', error);
    throw new Error('Failed to process soil health card');
  }
}