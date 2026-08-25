import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Lock, User, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { apiFetch } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    usernameOrPhone: "",
    password: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.usernameOrPhone.trim()) {
      newErrors.usernameOrPhone = "Username atau nomor HP harus diisi";
    }

    if (!formData.password) {
      newErrors.password = "Password harus diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    
    if (validateForm()) {
      try {
        const response = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify(formData),
        });

        // Store JWT token and user info
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Navigate based on user role
        if (response.user.role === "donor") {
          navigate("/donor");
        } else if (response.user.role === "recipient") {
          navigate("/recipient");
        } else if (response.user.role === "admin") {
          navigate("/admin");
        }
      } catch (err: any) {
        setApiError(err.message || "Gagal masuk. Silakan periksa kembali kredensial Anda.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
            </div>
          </div>
          <CardTitle className="text-2xl">Masuk ke FoodPriority</CardTitle>
          <CardDescription>Selamat datang kembali! Silakan masuk untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          {apiError && <p className="text-sm text-red-500 text-center mb-4">{apiError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username or Phone */}
            <div className="space-y-2">
              <Label htmlFor="usernameOrPhone">
                Username atau Nomor HP <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="usernameOrPhone"
                  placeholder="Masukkan username atau nomor HP"
                  className="pl-10"
                  value={formData.usernameOrPhone}
                  onChange={(e) => setFormData({...formData, usernameOrPhone: e.target.value})}
                />
              </div>
              {errors.usernameOrPhone && <p className="text-xs text-red-500">{errors.usernameOrPhone}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-green-600 hover:underline">
                Lupa password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Masuk
            </Button>

            <div className="text-center text-sm text-gray-600">
              Belum punya akun?{" "}
              <Link to="/register" className="text-green-600 hover:underline font-medium">
                Daftar di sini
              </Link>
            </div>
          </form>
          
          {/* Admin Login Link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link 
              to="/admin-login" 
              className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Shield className="w-3 h-3" />
              Masuk sebagai Admin
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}