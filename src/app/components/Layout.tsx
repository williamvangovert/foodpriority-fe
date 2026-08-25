import { useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Users, Shield, LogOut } from "lucide-react";
import { Button } from "./ui/button";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      navigate("/login", { replace: true });
      return;
    }

    // If at root path "/", redirect based on role
    if (location.pathname === "/") {
      try {
        const userObj = JSON.parse(savedUser);
        if (userObj.role === "donor") {
          navigate("/donor", { replace: true });
        } else if (userObj.role === "recipient") {
          navigate("/recipient", { replace: true });
        } else if (userObj.role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch (e) {
        navigate("/login", { replace: true });
      }
    }
  }, [location.pathname, navigate]);
  
  const isActive = (path: string) => {
    if (path === "/" || path === "/donor") {
      return location.pathname === "/" || location.pathname === "/donor";
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
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