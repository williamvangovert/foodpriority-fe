import { useState, useEffect } from "react";
import { MapPin, Navigation, Filter, Clock, TrendingUp, History, User as UserIcon, Star, Locate, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { apiFetch } from "../utils/api";

interface FoodItem {
  id: string;
  foodType: string;
  quantity: string;
  distance: number; // in km
  expiryHours: number;
  sawScore: number;
  location: { lat: number; lng: number; name: string };
  donor: string;
  donorRating: number;
  packaging: string;
}

interface CollectionHistory {
  id: string;
  foodType: string;
  quantity: string;
  collectedDate: string;
  donor: string;
  status: string;
}

export default function RecipientDashboard() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<string>("semua");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationAlertOpen, setIsLocationAlertOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [collectionHistory, setCollectionHistory] = useState<CollectionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedClaimItem, setSelectedClaimItem] = useState<FoodItem | null>(null);
  const [isClaimConfirmOpen, setIsClaimConfirmOpen] = useState(false);

  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("map");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : { nama_lengkap: "Penerima", username: "penerima", no_hp: "-", alamat: "-" };
  });

  const fetchUserInfo = async () => {
    try {
      const data = await apiFetch("/auth/me");
      if (data) {
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Gagal mengambil data user:", err);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || mapInstance || !userLocation) return;

    const container = document.getElementById("map-container");
    if (!container) return;

    // Create Leaflet Map Instance
    const map = L.map("map-container").setView([userLocation.lat, userLocation.lng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    setMapInstance(map);

    // Force map to recalculate its viewport size after paint
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, [userLocation]);

  // Update Markers dynamically when mapInstance, foodItems, or userLocation updates
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstance || !userLocation) return;

    // Clear old markers
    mapMarkers.forEach(marker => marker.remove());

    const newMarkers: any[] = [];

    // Green marker for donors, blue marker for recipient
    const recipientIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const donorIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // 1. Add Recipient Location Marker
    const uMarker = L.marker([userLocation.lat, userLocation.lng], { icon: recipientIcon })
      .addTo(mapInstance)
      .bindPopup(`<b>Lokasi Anda (Penerima)</b><br/>${currentLocation || "Menghitung lokasi..."}`);
    newMarkers.push(uMarker);

    // 2. Add Donors / Food Location Markers
    foodItems.forEach(item => {
      if (item.location && item.location.lat && item.location.lng) {
        const markerText = `
          <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 140px;">
            <h4 style="margin:0 0 4px 0; color:#10b981; font-weight:bold;">${item.foodType}</h4>
            <p style="margin:0 0 2px 0; font-size:11px;">Donatur: <b>${item.donor}</b></p>
            <p style="margin:0 0 2px 0; font-size:11px;">Jumlah: ${item.quantity}</p>
            <p style="margin:0 0 2px 0; font-size:11px;">Jarak: ${item.distance} km</p>
            <p style="margin:0 0 6px 0; font-size:11px;">Skor SAW: <b>${item.sawScore.toFixed(2)}</b></p>
          </div>
        `;
        const marker = L.marker([item.location.lat, item.location.lng], { icon: donorIcon })
          .addTo(mapInstance)
          .bindPopup(markerText);
        newMarkers.push(marker);
      }
    });

    setMapMarkers(newMarkers);

    // Auto-fit bounds if we have donor locations
    if (newMarkers.length > 1) {
      const group = new L.featureGroup(newMarkers);
      mapInstance.fitBounds(group.getBounds().pad(0.1));
    } else {
      mapInstance.setView([userLocation.lat, userLocation.lng], 14);
    }

  }, [mapInstance, foodItems, userLocation]);

  const fetchRecommendations = async (lat: number, lng: number) => {
    try {
      setIsLoading(true);
      const data = await apiFetch(`/donations?lat=${lat}&lng=${lng}`);
      const now = new Date();
      
      const mapped: FoodItem[] = data.map((d: any) => {
        const diffMs = new Date(d.batas_kadaluwarsa).getTime() - now.getTime();
        const expiryHours = Math.max(0.1, diffMs / (1000 * 60 * 60));

        return {
          id: d.id.toString(),
          foodType: d.nama_makanan,
          quantity: `${d.jumlah_porsi} porsi`,
          distance: d.jarak,
          expiryHours: Number(expiryHours.toFixed(1)),
          sawScore: d.skor_saw || 0,
          location: {
            lat: Number(d.latitude_donatur),
            lng: Number(d.longitude_donatur),
            name: d.alamat_donatur || "Lokasi Donatur",
          },
          donor: d.nama_donatur || "Donatur",
          donorRating: 4.8, // Default rating placeholder
          packaging: d.kemasan || "Baik",
        };
      });

      setFoodItems(mapped);
    } catch (err) {
      console.error("Gagal mengambil donasi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyClaims = async () => {
    try {
      const data = await apiFetch("/claims/my");
      const mapped: CollectionHistory[] = data.map((c: any) => ({
        id: c.id.toString(),
        foodType: c.nama_makanan,
        quantity: "1 porsi",
        collectedDate: c.waktu_klaim,
        donor: c.nama_donatur || "Donatur",
        status: c.status_klaim
      }));
      setCollectionHistory(mapped);
    } catch (err) {
      console.error("Gagal mengambil klaim:", err);
    }
  };

  // Get recipient location on load
  useEffect(() => {
    fetchUserInfo();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setCurrentLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          fetchRecommendations(latitude, longitude);
        },
        (error) => {
          console.warn("Location permission denied, using default location (Jakarta)");
          const defaultLoc = { lat: -6.2088, lng: 106.8456 };
          setUserLocation(defaultLoc);
          setCurrentLocation(`${defaultLoc.lat.toFixed(6)}, ${defaultLoc.lng.toFixed(6)}`);
          fetchRecommendations(defaultLoc.lat, defaultLoc.lng);
        }
      );
    }
    fetchMyClaims();
  }, []);

  const handleLocationRequest = () => {
    setIsLocationAlertOpen(true);
  };

  const handleLocationAllow = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setCurrentLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setIsLocationAlertOpen(false);
          fetchRecommendations(latitude, longitude);
          alert(`Lokasi berhasil diperoleh!\nKoordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocationAlertOpen(false);
          alert("Gagal mendapatkan lokasi. Pastikan GPS Anda aktif.");
        }
      );
    } else {
      setIsLocationAlertOpen(false);
      alert("Geolocation tidak didukung oleh browser Anda.");
    }
  };

  const handleRecenterMap = () => {
    if (mapInstance && userLocation) {
      mapInstance.setView([userLocation.lat, userLocation.lng], 15, {
        animate: true,
        duration: 1.0
      });
    }
  };

  const handleInitiateClaim = (item: FoodItem) => {
    setSelectedClaimItem(item);
    setIsClaimConfirmOpen(true);
  };

  const handleConfirmClaimFood = async () => {
    if (!selectedClaimItem) return;
    try {
      const response = await apiFetch("/claims", {
        method: "POST",
        body: JSON.stringify({
          id_donasi: parseInt(selectedClaimItem.id, 10),
          jarak_antar_lokasi: selectedClaimItem.distance,
          skor_saw: selectedClaimItem.sawScore,
        }),
      });

      setIsClaimConfirmOpen(false);
      
      // Navigate to claim detail page
      if (response.claim && response.claim.id) {
        navigate(`/claim/${response.claim.id}`);
      } else {
        fetchMyClaims();
        if (userLocation) {
          fetchRecommendations(userLocation.lat, userLocation.lng);
        }
      }
    } catch (err: any) {
      alert(err.message || "Gagal mengklaim makanan.");
      setIsClaimConfirmOpen(false);
    }
  };

  const stats = {
    totalClaimed: collectionHistory.length,
    activeClaims: collectionHistory.filter(c => c.status === "Menunggu" || c.status === "Diambil").length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Menunggu":
        return "bg-yellow-100 text-yellow-800";
      case "Diambil":
        return "bg-blue-100 text-blue-800";
      case "Selesai":
        return "bg-green-100 text-green-800";
      case "Dibatalkan":
      default:
        return "bg-red-100 text-red-800";
    }
  };

  const getExpiryColor = (hours: number) => {
    if (hours < 48) return "text-red-600";
    if (hours < 168) return "text-yellow-600";
    return "text-green-600";
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800";
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const filteredItems = selectedFilter === "semua" 
    ? foodItems 
    : foodItems.filter(item => item.foodType.toLowerCase() === selectedFilter.toLowerCase());

  const sortedItems = [...filteredItems].sort((a, b) => b.sawScore - a.sawScore);

  const renderRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className="w-4 h-4 text-yellow-400" />
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 absolute top-0 left-0" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
        ))}
        <span className="text-sm font-medium text-gray-700 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Penerima</h2>
          <p className="text-gray-600">Temukan donasi makanan di sekitar Anda</p>
        </div>
        
        {/* Profile Section */}
        <Link to="/profile">
          <Card className="w-64 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{user.nama_lengkap}</h3>
                  <p className="text-sm text-gray-600">@{user.username}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">No. HP:</span>
                  <span className="font-medium">{user.no_hp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Alamat:</span>
                  <span className="font-medium text-right text-xs">{user.alamat}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        if (val === "map" && mapInstance) {
          setTimeout(() => {
            mapInstance.invalidateSize();
          }, 100);
        }
      }} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="map">Tampilan Peta</TabsTrigger>
          <TabsTrigger value="list">Tampilan Daftar</TabsTrigger>
        </TabsList>

        {/* Map View */}
        <div className={activeTab === "map" ? "space-y-6" : "hidden"}>
          {/* Interactive Map */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lokasi Makanan di Sekitar Anda</CardTitle>
                  <CardDescription>Peta interaktif menampilkan donasi yang tersedia</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleLocationAllow}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Gunakan Lokasi Saat Ini
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Leaflet Map Container with Floating Recenter Button */}
              <div className="relative">
                <div id="map-container" style={{ height: "384px" }} className="w-full rounded-lg overflow-hidden border border-gray-200 z-0"></div>
                {userLocation && (
                  <button 
                    onClick={handleRecenterMap}
                    className="absolute bottom-4 right-4 z-[1000] p-3 bg-white hover:bg-gray-50 rounded-full shadow-lg border border-gray-200 text-gray-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Kembali ke lokasi saya"
                  >
                    <Locate className="w-6 h-6 text-blue-600" />
                  </button>
                )}
              </div>
              
              {/* Map Legend */}
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full" />
                  <span className="text-gray-600">Lokasi Anda</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-gray-600">Makanan Tersedia (Donatur)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List View */}
        <div className={activeTab === "list" ? "space-y-6" : "hidden"}>
          {/* Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter berdasarkan Jenis Makanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Jenis Makanan</SelectItem>
                    <SelectItem value="beras">Beras</SelectItem>
                    <SelectItem value="roti">Roti</SelectItem>
                    <SelectItem value="buah">Buah</SelectItem>
                    <SelectItem value="sayuran">Sayuran</SelectItem>
                    <SelectItem value="produk susu">Produk Susu</SelectItem>
                    <SelectItem value="sayuran kaleng">Makanan Kaleng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* SAW Ranked Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Makanan Rekomendasi (Peringkat SAW)</CardTitle>
              <CardDescription>Diurutkan berdasarkan skor prioritas dari jarak dan waktu kedaluwarsa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-semibold">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.foodType}</h4>
                          <p className="text-sm text-gray-600 mb-1">{item.quantity} • {item.donor}</p>
                          {renderRating(item.donorRating)}
                        </div>
                      </div>
                      <Badge className={getScoreColor(item.sawScore)} variant="secondary">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Skor: {item.sawScore.toFixed(2)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-500">Jarak</div>
                          <div className="font-medium text-sm">{item.distance} km</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${getExpiryColor(item.expiryHours)}`} />
                        <div>
                          <div className="text-xs text-gray-500">Kedaluwarsa</div>
                          <div className={`font-medium text-sm ${getExpiryColor(item.expiryHours)}`}>
                            {item.expiryHours < 48
                              ? `${item.expiryHours} jam`
                              : `${Math.floor(item.expiryHours / 24)} hari`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4" />
                        <div>
                          <div className="text-xs text-gray-500">Kemasan</div>
                          <div className="font-medium text-sm">{item.packaging}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {item.location.name}
                      </div>
                      <Button size="sm" onClick={() => handleInitiateClaim(item)}>Klaim Makanan</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>

      {/* Collection History */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            <CardTitle>Riwayat Pengambilan</CardTitle>
          </div>
          <CardDescription>Makanan yang telah Anda ambil sebelumnya (Klik untuk lihat detail & petunjuk arah)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {collectionHistory.map((item) => (
              <div 
                key={item.id}
                onClick={() => navigate(`/claim/${item.id}`)}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-green-50/80 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-green-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  <div>
                    <div className="font-medium text-gray-900">{item.foodType}</div>
                    <div className="text-sm text-gray-600">{item.quantity} dari {item.donor}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500 text-right">
                    <div>{new Date(item.collectedDate).toLocaleDateString('id-ID')}</div>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{item.status}</Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Alert Dialog */}
      <AlertDialog open={isLocationAlertOpen} onOpenChange={setIsLocationAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gunakan Lokasi Anda?</AlertDialogTitle>
            <AlertDialogDescription>
              Izinkan aplikasi untuk mengakses lokasi Anda saat ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsLocationAlertOpen(false)}>
              Batalkan
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLocationAllow}>
              Izinkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Claim Confirmation Alert Dialog */}
      <AlertDialog open={isClaimConfirmOpen} onOpenChange={setIsClaimConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Konfirmasi Klaim Makanan</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-gray-700">
              {selectedClaimItem && (
                <>
                  <p>Apakah Anda yakin ingin mengklaim donasi makanan berikut?</p>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-1.5 text-gray-900">
                    <div className="font-bold text-green-700 text-base">{selectedClaimItem.foodType}</div>
                    <div>Donatur: <b>{selectedClaimItem.donor}</b></div>
                    <div>Jumlah Porsi: {selectedClaimItem.quantity}</div>
                    <div>Jarak ke Donatur: <b>{selectedClaimItem.distance} km</b></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Setelah klaim dikonfirmasi, Anda akan langsung diarahkan ke Halaman Detail Klaim untuk melihat rute penjemputan di Google Maps.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={() => setIsClaimConfirmOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClaimFood}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Ya, Klaim Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}