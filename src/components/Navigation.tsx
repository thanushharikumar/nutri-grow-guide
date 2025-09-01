import { Link, useLocation } from "react-router-dom";
import { Leaf, ChartBar, Info } from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-soft">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">
                Sustainable Fertilizer
              </h1>
              <p className="text-sm text-muted-foreground -mt-1">
                Usage Optimizer
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive("/")
                  ? "bg-gradient-primary text-primary-foreground shadow-soft"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Leaf className="h-4 w-4" />
              <span className="font-medium">Home</span>
            </Link>
            
            <Link
              to="/recommendation"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive("/recommendation")
                  ? "bg-gradient-primary text-primary-foreground shadow-soft"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <ChartBar className="h-4 w-4" />
              <span className="font-medium">Get Recommendation</span>
            </Link>
            
            <Link
              to="/about"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive("/about")
                  ? "bg-gradient-primary text-primary-foreground shadow-soft"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Info className="h-4 w-4" />
              <span className="font-medium">About</span>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <select
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={location.pathname}
              onChange={(e) => window.location.href = e.target.value}
            >
              <option value="/">Home</option>
              <option value="/recommendation">Get Recommendation</option>
              <option value="/about">About</option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;