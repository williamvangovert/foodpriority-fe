import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Users, Shield, LogOut } from "lucide-react";
import { Button } from "./ui/button";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path: string) => {
    if (path === "/" || path === "/donor") {
      return location.pathname === "/" || location.pathname === "/donor";
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    // Clear any auth data here if needed
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">FoodPriority</h1>
            </div>
            
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}