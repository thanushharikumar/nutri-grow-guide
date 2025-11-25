import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Leaf, 
  TrendingUp, 
  Calendar,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { RecommendationResult } from "@/services/recommendationEngine";
import { WeatherData } from "@/services/weatherService";
import { CropAnalysisResult } from "@/services/cropAnalysisService";
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface RecommendationResultsProps {
  results: RecommendationResult;
  weather: WeatherData;
  cropAnalysis?: CropAnalysisResult;
  cropType: string;
}

const INR_EXCHANGE_RATE = 83;

const RecommendationResults = ({ results, weather, cropAnalysis, cropType }: RecommendationResultsProps) => {
  const sustainabilityData = [
    { name: 'Sustainability Score', value: results.sustainabilityScore, fill: 'hsl(var(--primary))' }
  ];

  const nutrientData = [
    { name: 'Nitrogen (N)', value: results.fertilizer.nitrogen, fill: 'hsl(var(--primary))' },
    { name: 'Phosphorus (P₂O₅)', value: results.fertilizer.phosphorus, fill: 'hsl(var(--earth))' },
    { name: 'Potassium (K₂O)', value: results.fertilizer.potassium, fill: 'hsl(var(--primary-glow))' },
  ];

  const costInINR = Math.max(0, results.costEstimate ?? 0);
  const costInUSD = costInINR > 0 ? Math.round(costInINR / INR_EXCHANGE_RATE) : 0;

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-primary text-primary-foreground';
      case 'good': return 'bg-primary-glow text-white';
      case 'fair': return 'bg-earth text-earth-foreground';
      case 'poor': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-primary text-primary-foreground';
      case 'moderate': return 'bg-earth text-earth-foreground';
      case 'high': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sustainability Score & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-gradient-primary text-primary-foreground shadow-medium">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Leaf className="h-6 w-6" />
              <span>Sustainability Score</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="relative w-48 h-48 mx-auto mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={sustainabilityData}>
                  <RadialBar dataKey="value" cornerRadius={10} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-current text-3xl font-bold">
                    {results.sustainabilityScore}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm opacity-90">
              {results.sustainabilityScore >= 80 ? "Excellent sustainability practices!" : 
               results.sustainabilityScore >= 60 ? "Good environmental stewardship" :
               "Room for sustainability improvement"}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-card-foreground">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span>Expected Outcomes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  +{results.expectedYieldIncrease}%
                </div>
                <div className="text-sm text-muted-foreground">Yield Increase</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-earth mb-1">
                  ₹{costInINR.toLocaleString('en-IN')}
                </div>
                {costInUSD > 0 && (
                  <div className="text-xs text-muted-foreground mb-1">
                    ≈ ${costInUSD.toLocaleString('en-US')}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">Cost per Hectare</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-glow mb-2">
                  {cropType.charAt(0).toUpperCase() + cropType.slice(1)}
                </div>
                <div className="text-sm text-muted-foreground">Crop Type</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fertilizer Recommendations */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-card-foreground">
            <Leaf className="h-6 w-6 text-primary" />
            <span>Fertilizer Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-card-foreground mb-4">Nutrient Requirements (kg/ha)</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nitrogen (N)</span>
                  <span className="font-semibold text-primary">{results.fertilizer.nitrogen} kg/ha</span>
                </div>
                <Progress value={Math.min(100, (results.fertilizer.nitrogen / 200) * 100)} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Phosphorus (P₂O₅)</span>
                  <span className="font-semibold text-earth">{results.fertilizer.phosphorus} kg/ha</span>
                </div>
                <Progress value={Math.min(100, (results.fertilizer.phosphorus / 120) * 100)} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Potassium (K₂O)</span>
                  <span className="font-semibold text-primary-glow">{results.fertilizer.potassium} kg/ha</span>
                </div>
                <Progress value={Math.min(100, (results.fertilizer.potassium / 100) * 100)} className="h-2" />
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-4">Nutrient Distribution</h4>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nutrientData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {nutrientData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Recommendations */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-card-foreground">Recommended Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.products.map((product, index) => (
              <Card key={index} className="bg-gradient-subtle border border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-card-foreground">{product.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {product.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div><strong>Quantity:</strong> {product.quantity} kg/ha</div>
                    <div><strong>Timing:</strong> {product.applicationTiming}</div>
                    <div><strong>Method:</strong> {product.method}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Crop Analysis Results */}
      {cropAnalysis && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-card-foreground">
              <Eye className="h-6 w-6 text-primary" />
              <span>Crop Health Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="text-lg font-semibold text-card-foreground">Overall Health:</div>
                  <Badge className={getHealthColor(cropAnalysis.cropHealth)}>
                    {cropAnalysis.cropHealth.toUpperCase()}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    ({Math.round(cropAnalysis.confidence * 100)}% confidence)
                  </div>
                </div>
                
                {cropAnalysis.deficiencies.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-3 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                      Detected Deficiencies
                    </h4>
                    <div className="space-y-3">
                      {cropAnalysis.deficiencies.map((deficiency, index) => (
                        <div key={index} className="p-3 bg-gradient-subtle rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize text-card-foreground">
                              {deficiency.nutrient} Deficiency
                            </span>
                            <Badge className={getSeverityColor(deficiency.severity)}>
                              {deficiency.severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <strong>Confidence:</strong> {Math.round(deficiency.confidence * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Symptoms: {deficiency.symptoms.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">No significant deficiencies detected</span>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-semibold text-card-foreground mb-3">AI Recommendations</h4>
                <div className="space-y-2">
                  {cropAnalysis.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-muted-foreground">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Schedule */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-card-foreground">
            <Calendar className="h-6 w-6 text-primary" />
            <span>Application Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.applicationSchedule.map((schedule, index) => (
              <div key={index} className="p-4 bg-gradient-subtle rounded-lg border">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                  <h4 className="font-semibold text-card-foreground">{schedule.stage}</h4>
                  <Badge variant="outline" className="w-fit">
                    Day {schedule.daysAfterPlanting >= 0 ? '+' : ''}{schedule.daysAfterPlanting}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong className="text-card-foreground">Fertilizers:</strong>
                    <div className="text-muted-foreground">{schedule.fertilizers.join(', ')}</div>
                  </div>
                  <div>
                    <strong className="text-card-foreground">Quantity:</strong>
                    <div className="text-muted-foreground">{schedule.quantity}</div>
                  </div>
                  <div>
                    <strong className="text-card-foreground">Method:</strong>
                    <div className="text-muted-foreground">{schedule.method}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weather Considerations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-card-foreground">
              <Thermometer className="h-6 w-6 text-primary" />
              <span>Current Weather</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Thermometer className="h-5 w-5 text-earth" />
                <div>
                  <div className="font-semibold text-card-foreground">{weather.temperature}°C</div>
                  <div className="text-xs text-muted-foreground">Temperature</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Droplets className="h-5 w-5 text-primary-glow" />
                <div>
                  <div className="font-semibold text-card-foreground">{weather.humidity}%</div>
                  <div className="text-xs text-muted-foreground">Humidity</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Droplets className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold text-card-foreground">{weather.rainfall}mm</div>
                  <div className="text-xs text-muted-foreground">Rainfall</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Wind className="h-5 w-5 text-earth" />
                <div>
                  <div className="font-semibold text-card-foreground">{weather.windSpeed} km/h</div>
                  <div className="text-xs text-muted-foreground">Wind Speed</div>
                </div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="text-center">
              <div className="font-semibold text-card-foreground">{weather.description}</div>
              <div className="text-sm text-muted-foreground">{weather.location}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-card-foreground">Weather Considerations</CardTitle>
          </CardHeader>
          <CardContent>
            {results.weatherConsiderations.length > 0 ? (
              <div className="space-y-3">
                {results.weatherConsiderations.map((consideration, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gradient-subtle rounded-lg">
                    <AlertCircle className="h-5 w-5 text-earth mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{consideration}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm">Weather conditions are optimal for fertilizer application</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecommendationResults;