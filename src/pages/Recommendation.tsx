import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Layout from "@/components/Layout";
import RecommendationResults from "@/components/RecommendationResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Camera, MapPin, Brain, Leaf } from "lucide-react";
import { getWeatherData, getUserLocation, WeatherData } from "@/services/weatherService";
import { analyzeCropImage, CropAnalysisResult } from "@/services/cropAnalysisService";
import { generateRecommendation, RecommendationResult, SoilData } from "@/services/recommendationEngine";
import { getSoilHealthData, SoilHealthData } from "@/services/soilHealthService";

const formSchema = z.object({
  soilType: z.enum(["sandy", "loamy", "clayey", "silty"], {
    required_error: "Please select a soil type",
  }),
  cropType: z.enum(["rice", "wheat", "maize", "millets"], {
    required_error: "Please select a crop type",
  }),
  pH: z.number().min(3).max(14, "pH must be between 3 and 14"),
  nitrogen: z.number().min(0).max(1000, "Nitrogen must be between 0 and 1000 ppm"),
  phosphorus: z.number().min(0).max(200, "Phosphorus must be between 0 and 200 ppm"),
  potassium: z.number().min(0).max(500, "Potassium must be between 0 and 500 ppm"),
  organicCarbon: z.number().min(0).max(10, "Organic Carbon must be between 0 and 10%"),
});

type FormData = z.infer<typeof formSchema>;

const Recommendation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [results, setResults] = useState<RecommendationResult | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [cropAnalysis, setCropAnalysis] = useState<CropAnalysisResult | null>(null);
  const [cropImage, setCropImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageValid, setImageValid] = useState<boolean | null>(null);
  const [soilHealthData, setSoilHealthData] = useState<SoilHealthData | null>(null);
  const [isLoadingSoilData, setIsLoadingSoilData] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pH: 6.5,
      nitrogen: 150,
      phosphorus: 25,
      potassium: 120,
      organicCarbon: 1.2,
    },
  });

  const fetchSoilData = async () => {
    setIsLoadingSoilData(true);
    try {
      toast({
        title: "Fetching soil data...",
        description: "Getting location and soil health card data",
      });

      let coordinates: { lat: number; lon: number };
      
      try {
        coordinates = await getUserLocation();
      } catch (locationError) {
        console.error('Geolocation error:', locationError);
        
        // Check if it's a permission error
        if (locationError instanceof GeolocationPositionError) {
          if (locationError.code === GeolocationPositionError.PERMISSION_DENIED) {
            toast({
              title: "Location Permission Required",
              description: "Please allow location access to fetch soil data from your area",
              variant: "destructive",
            });
          } else if (locationError.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
            toast({
              title: "Location Unavailable",
              description: "Unable to determine your location. Using default coordinates.",
            });
          } else {
            toast({
              title: "Location Timeout",
              description: "Location request timed out. Using default coordinates.",
            });
          }
        }
        
        // Use default coordinates for demonstration (New Delhi area)
        coordinates = { lat: 28.6139, lon: 77.2090 };
        
        toast({
          title: "Using default location",
          description: "Fetching soil data for New Delhi region as fallback",
        });
      }

      const soilData = await getSoilHealthData(coordinates);
      setSoilHealthData(soilData);
      
      // Auto-populate form with soil health card data
      form.setValue('soilType', soilData.soilType);
      form.setValue('pH', soilData.pH);
      form.setValue('nitrogen', soilData.nitrogen);
      form.setValue('phosphorus', soilData.phosphorus);
      form.setValue('potassium', soilData.potassium);
      form.setValue('organicCarbon', soilData.organicCarbon);

      toast({
        title: "Soil data loaded!",
        description: `Found soil health data for your location`,
      });
    } catch (error) {
      console.error('Error fetching soil data:', error);
      toast({
        title: "Soil data service error",
        description: "Unable to connect to soil health database. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSoilData(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic client-side checks
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG or PNG image",
        variant: "destructive",
      });
      return;
    }

    // Set preview immediately so user gets instant feedback
    setCropImage(file);
    setImageValid(null); // pending validation
    setCropAnalysis(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Perform immediate client-side validation/analysis. If it fails, clear the image and show error.
    try {
      toast({ title: 'Validating image...', description: 'Checking that uploaded image contains crop/leaf' });
      const result = await analyzeCropImage(file);
      // If analyzeCropImage resolves, it's treated as valid
      setCropAnalysis(result);
      setImageValid(true);
      toast({ title: 'Image validated', description: `Crop health: ${result.cropHealth}` });
    } catch (err: any) {
      console.error('Image validation failed on upload:', err);
      setCropImage(null);
      setImagePreview(null);
      setImageValid(false);
      setCropAnalysis(null);
      toast({ title: 'Invalid image', description: err?.message || 'Please upload a clear image of crops or leaves', variant: 'destructive' });
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setAnalysisProgress(0);
    setResults(null);
    setCropAnalysis(null);
    setWeatherData(null);

    try {
      // Step 1: Get user location and weather data
      setAnalysisProgress(20);
      toast({
        title: "Getting weather data...",
        description: "Fetching current weather conditions for your location",
      });

      let weather: WeatherData;
      try {
        const coordinates = await getUserLocation();
        weather = await getWeatherData(coordinates);
        toast({
          title: "Location detected",
          description: `Weather data retrieved for ${weather.location}`,
        });
      } catch (locationError) {
        console.warn('Location access denied, using default weather data');
        weather = await getWeatherData();
        toast({
          title: "Using default location",
          description: "Weather data retrieved for default location",
        });
      }
      setWeatherData(weather);

      // Step 2: Use cropAnalysis computed during upload if present
      let cropAnalysisResult: CropAnalysisResult | undefined = undefined;
      if (cropImage) {
        // If imageValid is explicitly false, stop early
        if (imageValid === false) {
          throw new Error('Uploaded image failed validation. Please upload a clear crop image.');
        }

        // If cropAnalysis was already computed during upload, reuse it. Otherwise analyze now.
        if (cropAnalysis) {
          cropAnalysisResult = cropAnalysis;
        } else {
          setAnalysisProgress(40);
          toast({
            title: "Analyzing crop image...",
            description: "AI is analyzing your crop for nutrient deficiencies",
          });

          try {
            cropAnalysisResult = await analyzeCropImage(cropImage);
            setCropAnalysis(cropAnalysisResult);
            setImageValid(true);
            toast({
              title: "Crop analysis complete",
              description: `Crop health assessed as ${cropAnalysisResult.cropHealth}`,
            });
          } catch (analysisError: any) {
            console.error('Crop analysis failed:', analysisError);
            setImageValid(false);
            throw new Error(analysisError?.message || "Please upload a valid crop image with visible plants or vegetation");
          }
        }
      }

      // Step 3: Generate recommendations
      setAnalysisProgress(70);
      toast({
        title: "Generating recommendations...",
        description: "Processing soil data and creating personalized fertilizer plan",
      });

      const soilData: SoilData = {
        soilType: data.soilType,
        pH: data.pH,
        nitrogen: data.nitrogen,
        phosphorus: data.phosphorus,
        potassium: data.potassium,
        organicCarbon: data.organicCarbon,
      };

      // Get location coordinates if available
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const coords = await getUserLocation();
        latitude = coords.lat;
        longitude = coords.lon;
      } catch {
        // Use weather data location if available
        if (weather.location) {
          console.log('Using weather location fallback');
        }
      }

      // Compress and convert image to base64 if provided
      let imageBase64: string | null = null;
      if (cropImage) {
        toast({
          title: "Processing image...",
          description: "Compressing and preparing image for analysis",
        });
        const { prepareImageFile } = await import('@/services/imageUtils');
        imageBase64 = await prepareImageFile(cropImage, 800, 0.7);
        console.log('Image prepared, base64 length:', imageBase64?.length);
      }

      // Call the edge function directly with compressed image
      const { callRecommendationApi } = await import('@/services/imageUtils');
      const recommendation = await callRecommendationApi({
        cropType: data.cropType,
        soilType: soilData.soilType,
        pH: soilData.pH,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        potassium: soilData.potassium,
        organicCarbon: soilData.organicCarbon,
        latitude,
        longitude,
        imageBase64
      });

      console.log('Edge function response:', recommendation);

      setAnalysisProgress(100);
      setResults(recommendation);

      toast({
        title: "Analysis complete!",
        description: `Sustainability score: ${recommendation.sustainabilityScore}%`,
      });

    } catch (error: any) {
      console.error('Recommendation generation failed:', error);
      toast({
        title: "Analysis failed",
        description: error?.message || "Please check your inputs and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (results && weatherData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setResults(null);
                setWeatherData(null);
                setCropAnalysis(null);
                setAnalysisProgress(0);
              }}
              className="mb-4"
            >
              ← New Analysis
            </Button>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Your Personalized Recommendations
            </h1>
            <p className="text-muted-foreground">
              Based on your soil analysis, weather conditions, and crop requirements
            </p>
          </div>
          
          <RecommendationResults 
            results={results} 
            weather={weatherData}
            cropAnalysis={cropAnalysis || undefined}
            cropType={form.getValues().cropType}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Get Your Fertilizer Recommendation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Provide your soil analysis data and crop information to receive personalized, 
            sustainable fertilizer recommendations powered by AI and real-time weather data.
          </p>
        </div>

        {isLoading && (
          <Card className="mb-8 bg-gradient-primary text-primary-foreground shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <div className="flex-1">
                  <div className="font-semibold mb-2">Analyzing your data...</div>
                  <Progress value={analysisProgress} className="h-2 bg-primary-foreground/20" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Crop Information */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-card-foreground">
                  <Leaf className="h-6 w-6 text-primary" />
                  <span>Crop Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="cropType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-card-foreground">Crop Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select crop type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rice">Rice</SelectItem>
                            <SelectItem value="wheat">Wheat</SelectItem>
                            <SelectItem value="maize">Maize</SelectItem>
                            <SelectItem value="millets">Millets</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="soilType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-card-foreground">Soil Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select soil type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sandy">Sandy</SelectItem>
                            <SelectItem value="loamy">Loamy</SelectItem>
                            <SelectItem value="clayey">Clayey</SelectItem>
                            <SelectItem value="silty">Silty</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Crop Image Upload */}
                <div>
                  <Label className="text-card-foreground font-medium mb-3 block">
                    Crop Image Analysis (Optional)
                  </Label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <input
                          type="file"
                          id="crop-image"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isLoading}
                        />
                        <label 
                          htmlFor="crop-image" 
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <Camera className="h-8 w-8 text-muted-foreground" />
                          <div className="text-sm text-muted-foreground">
                            Upload crop image for AI analysis
                          </div>
                          <Button type="button" size="sm" className="mt-2">
                            <Upload className="h-4 w-4 mr-2" />
                            Choose Image
                          </Button>
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Max 5MB • JPEG, PNG supported
                      </p>
                    </div>
                    
                    {imagePreview && (
                      <div>
                        <div className="text-sm font-medium text-card-foreground mb-2">Preview:</div>
                        <img 
                          src={imagePreview} 
                          alt="Crop preview" 
                          className="w-full h-32 object-cover rounded-lg border border-border"
                        />
                        <div className="flex items-center mt-2 text-sm">
                          <Brain className="h-4 w-4 mr-2 text-primary" />
                          {imageValid === null && (
                            <span className="text-muted-foreground">Validating image...</span>
                          )}
                          {imageValid === true && (
                            <span className="text-green-600">Image validated for crop analysis</span>
                          )}
                          {imageValid === false && (
                            <span className="text-destructive">Invalid image — please upload a crop or leaf photo</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Soil Analysis */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-card-foreground">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-6 w-6 text-earth" />
                    <span>Soil Analysis Data</span>
                  </div>
                  {!soilHealthData && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchSoilData}
                      disabled={isLoadingSoilData || isLoading}
                      className="ml-auto"
                    >
                      {isLoadingSoilData ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <MapPin className="h-4 w-4 mr-2" />
                      )}
                      {isLoadingSoilData ? "Loading..." : "Get Soil Data"}
                    </Button>
                  )}
                </CardTitle>
                {soilHealthData && (
                  <div className="text-sm text-muted-foreground animate-in slide-in-from-top-2 duration-500">
                    <p>📍 Location: {soilHealthData.location.latitude.toFixed(2)}°N, {soilHealthData.location.longitude.toFixed(2)}°E</p>
                    <p>📅 Last Updated: {soilHealthData.lastUpdated.toLocaleDateString()}</p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!soilHealthData ? (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      Get Your Soil Health Data
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Enter your farm's geolocation to automatically fetch soil analysis data from your Soil Health Card
                    </p>
                    <Button 
                      type="button" 
                      onClick={fetchSoilData}
                      disabled={isLoadingSoilData || isLoading}
                      className="bg-earth hover:bg-earth/90 text-white"
                    >
                      {isLoadingSoilData ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Fetching Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2" />
                          Get Soil Data from Location
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="animate-in slide-in-from-bottom-4 duration-700 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="pH"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-card-foreground">Soil pH *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="3"
                                max="14"
                                placeholder="6.5"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                className="bg-background"
                                readOnly
                              />
                            </FormControl>
                            <FormDescription>
                              Range: 3.0 - 14.0
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nitrogen"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-card-foreground">Nitrogen (ppm) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="1000"
                                placeholder="150"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                className="bg-background"
                                readOnly
                              />
                            </FormControl>
                            <FormDescription>
                              Available nitrogen content
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phosphorus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-card-foreground">Phosphorus (ppm) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="200"
                                placeholder="25"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                className="bg-background"
                                readOnly
                              />
                            </FormControl>
                            <FormDescription>
                              Available phosphorus content
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="potassium"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-card-foreground">Potassium (ppm) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="500"
                                placeholder="120"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                className="bg-background"
                                readOnly
                              />
                            </FormControl>
                            <FormDescription>
                              Available potassium content
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="organicCarbon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-card-foreground">Organic Carbon (%) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="1.2"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                className="bg-background"
                                readOnly
                              />
                            </FormControl>
                            <FormDescription>
                              Organic matter content
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Data automatically populated from Soil Health Card for your location</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="text-center">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isLoading || (cropImage ? imageValid !== true : false)}
                    className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-strong transition-all duration-300 hover:scale-105"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-5 w-5" />
                        Generate Recommendations
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    Our AI will analyze your data with weather conditions to provide personalized recommendations
                  </p>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default Recommendation;