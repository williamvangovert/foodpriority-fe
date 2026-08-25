import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, Lock, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { apiFetch } from "../utils/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username admin harus diisi";
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
          body: JSON.stringify({
            usernameOrPhone: formData.username,
            password: formData.password
          }),
        });

        if (response.user.role !== "admin") {
          throw new Error("Akses ditolak. Akun Anda bukan Administrator.");
        }

        // Store JWT token and user info
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Redirect to admin dashboard
        navigate("/admin");
      } catch (err: any) {
        setApiError(err.message || "Gagal masuk sebagai admin. Periksa kembali username & password Anda.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Login Admin</CardTitle>
          <CardDescription>Akses khusus untuk administrator FoodPriority</CardDescription>
        </CardHeader>
        <CardContent>
          {apiError && <p className="text-sm text-red-500 text-center mb-4">{apiError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">
                Username Admin <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  placeholder="Masukkan username admin"
                  className="pl-10"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
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

            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
              Masuk sebagai Admin
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-gray-600 hover:underline">
                ← Kembali ke login pengguna
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
