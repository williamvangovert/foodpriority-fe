const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  
  const headers = {
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If the body is FormData (for upload), don't set Content-Type manually
  // Multer needs to set the boundary automatically
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
};

export const getImageUrl = (path: string | null): string => {
  if (!path) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60"; // fallback placeholder
  if (path.startsWith("http")) return path;
  const imageBase = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5001";
  return `${imageBase}${path}`;
};
