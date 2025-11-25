import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChartBar, Info, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import leafLogo from "@/assets/leaf-logo.svg";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative h-10 w-10 rounded-2xl bg-primary/10 shadow-glow ring-1 ring-primary/30">
              <img
                src={leafLogo}
                alt="Sustainable Fertilizer logo"
                className="h-full w-full p-1.5"
                loading="eager"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Sustainable</p>
              <p className="text-base font-semibold text-foreground leading-tight">Fertilizer Guide</p>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive("/")
                  ? "bg-gradient-primary text-primary-foreground shadow-soft"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <span className="font-medium">Home</span>
            </Link>
            
            {user && (
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
            )}
            
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

            {user ? (
              <Button
                onClick={signOut}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="ml-2">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <select
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={location.pathname}
              onChange={(e) => navigate(e.target.value)}
            >
              <option value="/">Home</option>
              {user && <option value="/recommendation">Get Recommendation</option>}
              <option value="/about">About</option>
              {!user && <option value="/auth">Sign In</option>}
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;