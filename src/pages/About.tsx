import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Target, Users, Award, Brain, Zap } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: <Leaf className="h-8 w-8 text-primary" />,
      title: "Sustainability First",
      description: "We prioritize environmental sustainability in all our recommendations, helping farmers reduce their ecological footprint while maintaining productivity."
    },
    {
      icon: <Brain className="h-8 w-8 text-earth" />,
      title: "Science-Driven",
      description: "Our recommendations are based on cutting-edge soil science, agronomy research, and machine learning algorithms trained on vast agricultural datasets."
    },
    {
      icon: <Users className="h-8 w-8 text-primary-glow" />,
      title: "Farmer-Centric",
      description: "We design our platform with farmers in mind, ensuring accessibility, ease of use, and practical applicability in real farming conditions."
    }
  ];

  const features = [
    {
      icon: <Target className="h-6 w-6 text-primary" />,
      title: "Precision Agriculture",
      description: "Site-specific recommendations based on detailed soil analysis and crop requirements."
    },
    {
      icon: <Zap className="h-6 w-6 text-earth" />,
      title: "Real-time Weather Integration",
      description: "Weather-responsive recommendations that optimize fertilizer timing and application methods."
    },
    {
      icon: <Brain className="h-6 w-6 text-primary-glow" />,
      title: "AI-Powered Crop Analysis",
      description: "Computer vision technology to detect nutrient deficiencies from crop images."
    },
    {
      icon: <Award className="h-6 w-6 text-earth" />,
      title: "Sustainability Scoring",
      description: "Comprehensive sustainability metrics to help farmers make environmentally conscious decisions."
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-gradient-hero text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              About Our Platform
            </h1>
            <p className="text-xl leading-relaxed">
              Revolutionizing agriculture through intelligent fertilizer optimization, 
              combining traditional farming wisdom with modern technology.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To empower farmers worldwide with intelligent tools that optimize fertilizer usage,
                increase crop yields, and promote sustainable agricultural practices for a better future.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="bg-card border-border shadow-soft hover:shadow-medium transition-all duration-300">
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      {value.icon}
                    </div>
                    <CardTitle className="text-xl text-card-foreground">
                      {value.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              How Our Platform Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our comprehensive approach combines multiple data sources and advanced analytics
              to provide the most accurate and actionable fertilizer recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border shadow-soft hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    {feature.icon}
                    <h3 className="font-semibold text-card-foreground">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
              Technology Stack
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-gradient-primary text-primary-foreground shadow-medium">
                <CardHeader>
                  <CardTitle className="text-xl">Machine Learning & AI</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Convolutional Neural Networks (CNN) for crop image analysis</li>
                    <li>• Predictive models for yield optimization</li>
                    <li>• Natural language processing for agricultural insights</li>
                    <li>• Ensemble learning for recommendation accuracy</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-earth text-earth-foreground shadow-medium">
                <CardHeader>
                  <CardTitle className="text-xl">Data Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• OpenWeatherMap API for real-time weather data</li>
                    <li>• Comprehensive soil nutrient databases</li>
                    <li>• Crop growth stage monitoring systems</li>
                    <li>• Historical yield and climate data analysis</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-xl text-card-foreground">Agricultural Science</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Evidence-based nutrient management principles</li>
                    <li>• Soil-plant-atmosphere continuum modeling</li>
                    <li>• Integrated pest and nutrient management</li>
                    <li>• Sustainable agriculture best practices</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-xl text-card-foreground">Platform Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Responsive web design for mobile accessibility</li>
                    <li>• Real-time data processing and visualization</li>
                    <li>• Interactive charts and sustainability scoring</li>
                    <li>• Secure data handling and privacy protection</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Our Impact
            </h2>
            <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
              Since our launch, we've helped farmers across the globe optimize their agricultural practices,
              resulting in significant improvements in both productivity and sustainability.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">10,000+</div>
                <div className="text-muted-foreground">Farmers Served</div>
              </div>
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-earth mb-2">1.2M</div>
                <div className="text-muted-foreground">Hectares Optimized</div>
              </div>
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary-glow mb-2">25%</div>
                <div className="text-muted-foreground">Average Yield Increase</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;