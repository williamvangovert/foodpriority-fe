import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MapPin, Clock, Phone, User, Navigation, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { apiFetch, getImageUrl } from "../utils/api";

interface ClaimDetailData {
  id: number;
  id_donasi: number;
  id_penerima: number;
  id_donatur: number;
  waktu_klaim: string;
  jarak_antar_lokasi: number;
  skor_saw: number;
  status_klaim: "Menunggu" | "Diambil" | "Selesai" | "Dibatalkan";
  nama_makanan: string;
  foto_makanan: string | null;
  deskripsi: string;
  kemasan: string;
  batas_kadaluwarsa: string;
  latitude_donatur: number;
  longitude_donatur: number;
  nama_donatur: string;
  alamat_donatur: string;
  no_hp_donatur: string;
  nama_penerima: string;
  alamat_penerima: string;
  no_hp_penerima: string;
}

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ClaimDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchClaimDetail = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch(`/claims/${id}`);
      setClaim(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat detail klaim.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get recipient's current GPS location for accurate Google Maps origin
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn("Location permission denied or unavailable:", err);
        }
      );
    }
    fetchClaimDetail();
  }, [id]);

  // Leaflet map setup for claim location with route line
  useEffect(() => {
    if (!claim || !claim.latitude_donatur || !claim.longitude_donatur) return;
    const L = (window as any).L;
    if (!L) return;

    const container = document.getElementById("claim-map-container");
    if (!container) return;

    if (mapInstance) {
      mapInstance.remove();
    }

    const donorLat = Number(claim.latitude_donatur);
    const donorLng = Number(claim.longitude_donatur);

    const map = L.map("claim-map-container").setView([donorLat, donorLng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const donorIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const recipientIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const markers: any[] = [];

    // Donor Marker
    const donorMarker = L.marker([donorLat, donorLng], { icon: donorIcon })
      .addTo(map)
      .bindPopup(`<b>${claim.nama_makanan}</b><br/>Donatur: ${claim.nama_donatur}`);
    markers.push(donorMarker);

    // If recipient location is available, add recipient marker & polyline
    if (userLocation) {
      const recipientMarker = L.marker([userLocation.lat, userLocation.lng], { icon: recipientIcon })
        .addTo(map)
        .bindPopup("<b>Lokasi Anda (Penerima)</b>");
      markers.push(recipientMarker);

      // Draw dashed blue route line between Recipient and Donor
      const routeLine = L.polyline([
        [userLocation.lat, userLocation.lng],
        [donorLat, donorLng]
      ], {
        color: '#2563eb',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8
      }).addTo(map);

      // Fit map view bounds to cover both points
      const group = new L.featureGroup([donorMarker, recipientMarker, routeLine]);
      map.fitBounds(group.getBounds().pad(0.15));
    } else {
      donorMarker.openPopup();
    }

    setMapInstance(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, [claim, userLocation]);

  const handleOpenGoogleMaps = () => {
    if (!claim) return;
    const dest = `${claim.latitude_donatur},${claim.longitude_donatur}`;
    let mapsUrl = "";

    if (userLocation) {
      // Include exact user GPS origin for precise route navigation
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${dest}&travelmode=driving`;
    } else {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    }

    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleContactWhatsApp = () => {
    if (!claim || !claim.no_hp_donatur) return;
    let cleanPhone = claim.no_hp_donatur.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(`Halo ${claim.nama_donatur}, saya penerima donasi "${claim.nama_makanan}" di FoodPriority.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "-";
    const clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      return clean.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
    }
    return phone;
  };

  const getStatusColor = (status: ClaimDetailData["status_klaim"]) => {
    switch (status) {
      case "Menunggu":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Diambil":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Selesai":
        return "bg-green-100 text-green-800 border-green-300";
      case "Dibatalkan":
      default:
        return "bg-red-100 text-red-800 border-red-300";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-900 mb-2">Klaim Tidak Ditemukan</h3>
            <p className="text-sm text-red-700 mb-4">{error || "Detail klaim tidak tersedia."}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Back Navigation */}
      <Button 
        variant="ghost" 
        className="mb-6 hover:bg-gray-100"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Dashboard
      </Button>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Detail Klaim Makanan</h1>
            <Badge className={`${getStatusColor(claim.status_klaim)} border text-xs px-2.5 py-0.5 font-medium`}>
              {claim.status_klaim === "Menunggu" && "Menunggu Penjemputan"}
              {claim.status_klaim === "Diambil" && "Sedang Diambil"}
              {claim.status_klaim === "Selesai" && "Selesai"}
              {claim.status_klaim === "Dibatalkan" && "Dibatalkan"}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">ID Transaksi Klaim: #{claim.id}</p>
        </div>

        {/* Action Button: Google Maps */}
        <Button 
          size="lg" 
          className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-md flex items-center gap-2"
          onClick={handleOpenGoogleMaps}
        >
          <Navigation className="w-5 h-5" />
          Buka Rute di Google Maps
          <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (Left 2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Food Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{claim.nama_makanan}</CardTitle>
              <CardDescription>Informasi makanan yang diklaim</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {claim.foto_makanan && (
                <div className="rounded-lg overflow-hidden border border-gray-200 h-64 w-full">
                  <img 
                    src={getImageUrl(claim.foto_makanan)} 
                    alt={claim.nama_makanan} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-gray-700 text-sm leading-relaxed">
                {claim.deskripsi || "Tidak ada deskripsi tambahan."}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Kondisi Kemasan</span>
                  <span className="font-medium text-gray-900">{claim.kemasan || "Baik"}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Batas Kedaluwarsa</span>
                  <span className="font-medium text-gray-900">
                    {new Date(claim.batas_kadaluwarsa).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map Preview Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Lokasi Penjemputan Makanan</span>
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  📍 Jarak: {claim.jarak_antar_lokasi} km
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                id="claim-map-container" 
                style={{ height: "260px" }} 
                className="w-full rounded-lg border border-gray-200 overflow-hidden z-0 mb-4"
              ></div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleOpenGoogleMaps}
              >
                <Navigation className="w-4 h-4 mr-2 text-green-600" />
                Buka Petunjuk Arah di Google Maps
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Info Sidebar (1 col) */}
        <div className="space-y-6">
          {/* Distance & Priority Score Card */}
          <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500 text-white rounded-full">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 font-medium">Jarak ke Donatur</div>
                  <div className="text-2xl font-bold text-gray-900">{claim.jarak_antar_lokasi} km</div>
                </div>
              </div>

              <div className="pt-3 border-t border-green-200/60 flex items-center justify-between text-xs text-gray-600">
                <span>Skor Prioritas SAW</span>
                <span className="font-semibold text-green-800 bg-green-200/60 px-2 py-0.5 rounded">
                  {claim.skor_saw ? claim.skor_saw.toFixed(2) : "-"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Donor Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                Informasi Donatur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-gray-500 block">Nama Donatur</span>
                <span className="font-semibold text-gray-900">{claim.nama_donatur}</span>
              </div>

              <div>
                <span className="text-xs text-gray-500 block">Alamat Penjemputan</span>
                <span className="font-medium text-gray-800 leading-snug block mt-0.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-red-500" />
                  {claim.alamat_donatur}
                </span>
              </div>

              {claim.no_hp_donatur && (
                <div className="pt-3 border-t space-y-2">
                  <span className="text-xs text-gray-500 block">Kontak Donatur</span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">
                      {formatPhoneNumber(claim.no_hp_donatur)}
                    </span>
                  </div>
                  <Button 
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-2 py-2 h-auto text-xs shadow-sm"
                    onClick={handleContactWhatsApp}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Hubungi via WhatsApp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claim Transaction Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Waktu Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Waktu Diklaim:</span>
                <span className="font-medium text-gray-900">
                  {new Date(claim.waktu_klaim).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal Diklaim:</span>
                <span className="font-medium text-gray-900">
                  {new Date(claim.waktu_klaim).toLocaleDateString('id-ID')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
