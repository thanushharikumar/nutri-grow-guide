import { Link } from "react-router-dom";
import { Leaf, TrendingUp, Shield, Users, ArrowRight, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@/assets/hero-agriculture.jpg";

const Home = () => {
  const features = [
    {
      icon: <Leaf className="h-8 w-8 text-primary" />,
      title: "Smart Soil Analysis",
      description: "Advanced soil testing and nutrient analysis for optimal fertilizer recommendations."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-earth" />,
      title: "Crop Image Analysis",
      description: "AI-powered crop health assessment using computer vision to detect nutrient deficiencies."
    },
    {
      icon: <Shield className="h-8 w-8 text-primary-glow" />,
      title: "Weather Integration",
      description: "Real-time weather data integration for precise fertilizer timing recommendations."
    },
    {
      icon: <Users className="h-8 w-8 text-earth" />,
      title: "Sustainable Practices",
      description: "Promoting environmentally friendly farming with optimized fertilizer usage."
    }
  ];

  const benefits = [
    "Increase crop yield by up to 25%",
    "Reduce fertilizer costs by 15-30%",
    "Minimize environmental impact",
    "Optimize application timing",
    "Improve soil health over time"
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-hero/80"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Sustainable Fertilizer
              <span className="block text-primary-glow">Usage Optimizer</span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 text-white/90 leading-relaxed">
              Harness the power of AI, weather data, and soil science to optimize your fertilizer usage,
              increase yields, and promote sustainable agriculture.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/recommendation">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-glow transition-all duration-300 hover:shadow-strong hover:scale-105">
                  Get Smart Recommendations
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Advanced Agricultural Intelligence
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform combines cutting-edge technology with agricultural expertise
              to deliver precise, sustainable fertilizer recommendations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Maximize Your Farm's Potential
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Our intelligent system analyzes multiple factors including soil composition, 
                crop health, weather conditions, and historical data to provide you with 
                the most accurate fertilizer recommendations.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                    <span className="text-foreground font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <Card className="bg-gradient-primary text-primary-foreground shadow-strong">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="text-4xl lg:text-5xl font-bold mb-2">85%</div>
                    <div className="text-lg mb-4">Average Sustainability Score</div>
                    <div className="text-sm opacity-90">
                      Achieved by farmers using our recommendations
                    </div>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">25%</div>
                      <div className="text-sm opacity-90">Yield Increase</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">30%</div>
                      <div className="text-sm opacity-90">Cost Reduction</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Ready to Transform Your Farming?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of farmers who are already using our platform to optimize their 
            fertilizer usage and increase their sustainability scores.
          </p>
          <Link to="/recommendation">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-strong transition-all duration-300 hover:scale-105">
              Start Your Analysis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Home;