import { useState, useEffect } from "react";
import { Plus, Package, Users, TrendingUp, Clock, CheckCircle, Upload, User as UserIcon, MapPin, Phone, MessageSquare, AlertCircle, ChevronRight, Check, XCircle, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { apiFetch, getImageUrl } from "../utils/api";

interface Donation {
  id: string;
  foodType: string;
  quantity: string;
  stock: number;
  status: "Tersedia" | "Sedang Diambil" | "Selesai" | "Dibatalkan";
  expiryDate: string;
  createdAt: string;
  foto_makanan?: string;
}

interface IncomingClaim {
  id: number;
  id_donasi: number;
  nama_makanan: string;
  foto_makanan: string | null;
  nama_penerima: string;
  alamat_penerima: string;
  no_hp_penerima: string;
  waktu_klaim: string;
  jarak_antar_lokasi: number;
  skor_saw: number;
  status_klaim: "Menunggu" | "Diambil" | "Sedang Diambil" | "Selesai" | "Dibatalkan";
}

export default function DonorDashboard() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLocationAlertOpen, setIsLocationAlertOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [incomingClaims, setIncomingClaims] = useState<IncomingClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Change Confirmation Dialog State
  const [selectedDonationForComplete, setSelectedDonationForComplete] = useState<Donation | null>(null);
  const [selectedClaimForComplete, setSelectedClaimForComplete] = useState<IncomingClaim | null>(null);
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Cancellation State
  const [selectedDonationForCancel, setSelectedDonationForCancel] = useState<Donation | null>(null);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : { nama_lengkap: "Donatur", username: "donatur", no_hp: "-", alamat: "-" };
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

  const [formData, setFormData] = useState({
    foodType: "",
    quantity: "",
    packaging: "",
    expiryDate: "",
    description: "",
    foodImage: null as File | null
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch donor's donations
  const fetchMyDonations = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch("/donations/my");
      // Map database schema to frontend Donation format
      const mapped = data.map((d: any) => ({
        id: d.id.toString(),
        foodType: d.nama_makanan,
        quantity: `${d.jumlah_porsi} porsi`,
        stock: d.jumlah_porsi,
        status: d.status_donasi,
        expiryDate: d.batas_kadaluwarsa,
        createdAt: d.waktu_input,
        foto_makanan: d.foto_makanan
      }));
      setDonations(mapped);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat donasi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch incoming claims on donor's items
  const fetchIncomingClaims = async () => {
    try {
      const data = await apiFetch("/claims/my");
      setIncomingClaims(data);
    } catch (err: any) {
      console.error("Gagal mengambil daftar klaim masuk:", err);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    fetchMyDonations();
    fetchIncomingClaims();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({...formData, foodImage: file});
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coords) {
      alert("Silakan klik tombol GPS untuk mengizinkan akses lokasi Anda terlebih dahulu.");
      setIsLocationAlertOpen(true);
      return;
    }

    try {
      const data = new FormData();
      data.append("nama_makanan", formData.foodType);
      data.append("jumlah_porsi", formData.quantity);
      data.append("kemasan", formData.packaging || "Baik");
      data.append("batas_kadaluwarsa", formData.expiryDate);
      data.append("deskripsi", formData.description);
      data.append("latitude_donatur", coords.lat.toString());
      data.append("longitude_donatur", coords.lng.toString());
      
      if (formData.foodImage) {
        data.append("foto_makanan", formData.foodImage);
      }

      await apiFetch("/donations", {
        method: "POST",
        body: data
      });

      // Reset form & reload donations
      setFormData({
        foodType: "",
        quantity: "",
        packaging: "",
        expiryDate: "",
        description: "",
        foodImage: null
      });
      setImagePreview(null);
      setIsDialogOpen(false);
      fetchMyDonations();
      fetchUserInfo();
      alert("Donasi makanan berhasil dibuat!");

    } catch (err: any) {
      alert(err.message || "Gagal membuat donasi makanan.");
    }
  };

  const handleLocationRequest = () => {
    setIsLocationAlertOpen(true);
  };

  const handleLocationAllow = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          setCurrentLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setIsLocationAlertOpen(false);
          alert(`Lokasi berhasil diperoleh!\nKoordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          setCoords(null);
          setCurrentLocation("");
          setIsLocationAlertOpen(false);
          alert("Akses lokasi ditolak atau gagal. Anda wajib mengaktifkan GPS dan memberikan izin lokasi untuk dapat memposting donasi makanan.");
        }
      );
    } else {
      setCoords(null);
      setCurrentLocation("");
      setIsLocationAlertOpen(false);
      alert("Geolocation tidak didukung oleh browser Anda. Anda wajib menggunakan browser yang mendukung GPS untuk berdonasi.");
    }
  };

  // Trigger modal confirmation for donation completion
  const handlePromptCompleteDonation = (donation: Donation) => {
    setSelectedDonationForComplete(donation);
    setSelectedClaimForComplete(null);
    setIsConfirmCompleteOpen(true);
  };

  // Trigger modal confirmation for claim completion
  const handlePromptCompleteClaim = (claim: IncomingClaim) => {
    setSelectedClaimForComplete(claim);
    setSelectedDonationForComplete(null);
    setIsConfirmCompleteOpen(true);
  };

  // Trigger modal confirmation for donation cancellation
  const handlePromptCancelDonation = (donation: Donation) => {
    setSelectedDonationForCancel(donation);
    setIsConfirmCancelOpen(true);
  };

  // Execute donation cancellation
  const handleExecuteCancelDonation = async () => {
    if (!selectedDonationForCancel) return;
    try {
      setIsUpdatingStatus(true);
      await apiFetch(`/donations/${selectedDonationForCancel.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status_donasi: "Dibatalkan" })
      });
      alert(`Donasi makanan "${selectedDonationForCancel.foodType}" berhasil dibatalkan.`);
      setIsConfirmCancelOpen(false);
      setSelectedDonationForCancel(null);
      fetchMyDonations();
      fetchIncomingClaims();
      fetchUserInfo();
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan donasi.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete donation permanently from database
  const handleDeleteDonation = async (donationId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus donasi ini secara permanen dari sistem?")) return;
    try {
      await apiFetch(`/donations/${donationId}`, {
        method: "DELETE"
      });
      alert("Donasi berhasil dihapus.");
      fetchMyDonations();
      fetchIncomingClaims();
      fetchUserInfo();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus donasi.");
    }
  };


  // Execute status update to 'Selesai' / 'Sudah Diambil'
  const handleExecuteStatusUpdate = async () => {
    try {
      setIsUpdatingStatus(true);
      if (selectedDonationForComplete) {
        // Update donation status to 'Selesai'
        await apiFetch(`/donations/${selectedDonationForComplete.id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status_donasi: "Selesai" })
        });
        alert(`Status donasi "${selectedDonationForComplete.foodType}" berhasil diubah menjadi Sudah Diambil (Selesai)!`);
      } else if (selectedClaimForComplete) {
        // Update claim status to 'Selesai'
        await apiFetch(`/claims/${selectedClaimForComplete.id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status_klaim: "Selesai" })
        });
        alert(`Status klaim makanan "${selectedClaimForComplete.nama_makanan}" berhasil dikonfirmasi Sudah Diambil!`);
      }

      setIsConfirmCompleteOpen(false);
      setSelectedDonationForComplete(null);
      setSelectedClaimForComplete(null);

      // Refresh data
      fetchMyDonations();
      fetchIncomingClaims();
      fetchUserInfo();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleContactWhatsApp = (noHp: string, namaPenerima: string, namaMakanan: string) => {
    if (!noHp) return;
    let cleanPhone = noHp.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(`Halo ${namaPenerima}, terkait klaim donasi "${namaMakanan}" di FoodPriority.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const stats = {
    totalDonated: donations.reduce((sum, d) => sum + d.stock, 0),
    peopleHelped: donations.filter(d => d.status === "Selesai").length * 5, // Estimated people helped
    activeDonations: donations.filter(d => d.status === "Tersedia" || d.status === "Sedang Diambil").length
  };

  const getStatusColor = (status: Donation["status"]) => {
    switch (status) {
      case "Tersedia":
        return "bg-green-100 text-green-800 border-green-300";
      case "Sedang Diambil":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Selesai":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Dibatalkan":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };


  const getClaimStatusBadge = (status: IncomingClaim["status_klaim"]) => {
    switch (status) {
      case "Menunggu":
      case "Diambil":
      case "Sedang Diambil":
        return (
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-medium">
            <Clock className="w-3 h-3 mr-1" />
            Sedang Diambil
          </Badge>
        );
      case "Selesai":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-medium">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sudah Diambil
          </Badge>
        );
      case "Dibatalkan":
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs font-medium">
            Dibatalkan
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Donatur</h2>
          <p className="text-gray-600">Kelola donasi makanan Anda, pantau penerima, dan konfirmasi penyerahan makanan</p>
        </div>
        
        {/* Profile Section */}
        <Link to="/profile">
          <Card className="w-full md:w-64 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{user.nama_lengkap}</h3>
                  <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">No. HP:</span>
                  <span className="font-medium">{user.no_hp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Alamat:</span>
                  <span className="font-medium text-right text-xs truncate max-w-[120px]">{user.alamat}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Makanan Didonasikan</CardTitle>
            <Package className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalDonated} porsi</div>
            <p className="text-xs text-gray-500 mt-1">Donasi sepanjang waktu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Donasi Selesai / Terklaim</CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{donations.filter(d => d.status === "Selesai").length} donasi</div>
            <p className="text-xs text-gray-500 mt-1">Makanan telah diserahkan & diambil</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Donasi Aktif & Proses Ambil</CardTitle>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.activeDonations}</div>
            <p className="text-xs text-gray-500 mt-1">Tersedia atau sedang dalam penjemputan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main CTA Button */}
      <div className="mb-8 flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm font-semibold">
              <Plus className="w-5 h-5 mr-2" />
              Donasikan Makanan Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Donasikan Makanan Baru</DialogTitle>
              <DialogDescription>
                Isi detail tentang makanan yang ingin Anda donasikan
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="foodType">Jenis Makanan</Label>
                <Select 
                  value={formData.foodType}
                  onValueChange={(value) => setFormData({...formData, foodType: value})}
                  required
                >
                  <SelectTrigger id="foodType">
                    <SelectValue placeholder="Pilih jenis makanan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beras">Beras</SelectItem>
                    <SelectItem value="Roti">Roti</SelectItem>
                    <SelectItem value="Buah">Buah</SelectItem>
                    <SelectItem value="Sayuran">Sayuran</SelectItem>
                    <SelectItem value="Makanan Kaleng">Makanan Kaleng</SelectItem>
                    <SelectItem value="Produk Susu">Produk Susu</SelectItem>
                    <SelectItem value="Daging">Daging</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah (Porsi / Kg)</Label>
                <Input
                  id="quantity"
                  placeholder="contoh: 5 porsi, 10 porsi"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="packaging">Kondisi Kemasan</Label>
                <Select
                  value={formData.packaging}
                  onValueChange={(value) => setFormData({...formData, packaging: value})}
                  required
                >
                  <SelectTrigger id="packaging">
                    <SelectValue placeholder="Pilih kondisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tersegel">Tersegel/Belum Dibuka</SelectItem>
                    <SelectItem value="Baik">Kondisi Baik</SelectItem>
                    <SelectItem value="Cukup">Kondisi Cukup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Tanggal Kedaluwarsa</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Catatan Tambahan (Opsional)</Label>
                <Textarea
                  id="description"
                  placeholder="Informasi tambahan..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Location Button */}
              <div className="space-y-2">
                <Label>Lokasi Donasi</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleLocationRequest}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Gunakan Lokasi Saat Ini
                </Button>
                {currentLocation && (
                  <p className="text-xs text-green-600 mt-1">
                    📍 Lokasi: {currentLocation}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="foodImage">Foto Makanan (Opsional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="foodImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <Upload className="w-4 h-4 text-gray-400" />
                </div>
                {imagePreview && (
                  <div className="mt-3 relative">
                    <img
                      src={imagePreview}
                      alt="Preview makanan"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">Preview foto makanan</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                  Kirim Donasi
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for Donation Management & Incoming Claims */}
      <Tabs defaultValue="donations" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="donations" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Donasi Saya ({donations.length})
          </TabsTrigger>
          <TabsTrigger value="claims" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Klaim Masuk ({incomingClaims.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Donasi Saya */}
        <TabsContent value="donations">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Donasi Makanan Saya</CardTitle>
              <CardDescription>
                Kelola status makanan yang Anda donasikan. Klik tombol <b>"Tandai Sudah Diambil"</b> saat penerima telah mengambil makanan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jenis Makanan</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sisa Stok</TableHead>
                      <TableHead>Tanggal Kedaluwarsa</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi Konfirmasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Belum ada donasi makanan yang dibuat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      donations.map((donation) => (
                        <TableRow key={donation.id}>
                          <TableCell className="font-semibold text-gray-900">
                            {donation.foodType}
                          </TableCell>
                          <TableCell>{donation.quantity}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(donation.status)} border`} variant="secondary">
                              {donation.status === "Tersedia" && <Clock className="w-3 h-3 mr-1 text-green-600" />}
                              {donation.status === "Sedang Diambil" && <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" />}
                              {donation.status === "Selesai" && <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />}
                              {donation.status === "Selesai" ? "Sudah Diambil" : donation.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Package className="w-3 h-3 text-gray-500" />
                              {donation.stock} porsi
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(donation.expiryDate).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell>{new Date(donation.createdAt).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {donation.status === "Sedang Diambil" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                                    onClick={() => handlePromptCompleteDonation(donation)}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Tandai Sudah Diambil
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs flex items-center gap-1"
                                    onClick={() => handlePromptCancelDonation(donation)}
                                    title="Batalkan Donasi"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Batalkan
                                  </Button>
                                </>
                              )}
                              {donation.status === "Tersedia" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs font-medium flex items-center gap-1.5"
                                  onClick={() => handlePromptCancelDonation(donation)}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Batalkan Donasi
                                </Button>
                              )}
                              {donation.status === "Selesai" && (
                                <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  Donasi Terklaim
                                </span>
                              )}
                              {donation.status === "Dibatalkan" && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-500 italic">Dibatalkan</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-400 hover:text-red-600 text-xs flex items-center gap-1 h-7 px-2"
                                    onClick={() => handleDeleteDonation(donation.id)}
                                    title="Hapus permanen dari daftar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Klaim Masuk dari Penerima */}
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Penerima yang Mengklaim Donasi Anda</CardTitle>
              <CardDescription>
                Pantau penerima yang sedang dalam perjalanan atau sudah mengambil makanan Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incomingClaims.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <Users className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="font-medium text-gray-700">Belum ada klaim masuk dari penerima.</p>
                  <p className="text-xs text-gray-500 mt-1">Saat ada penerima yang mengklaim donasi Anda, informasinya akan muncul di sini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incomingClaims.map((claim) => (
                    <div 
                      key={claim.id}
                      className="border border-gray-200 hover:border-green-300 rounded-lg p-4 bg-white hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-base">{claim.nama_makanan}</h4>
                          {getClaimStatusBadge(claim.status_klaim)}
                        </div>
                        <div className="text-sm text-gray-700">
                          Penerima: <span className="font-semibold text-gray-900">{claim.nama_penerima}</span>
                          {claim.alamat_penerima && <span className="text-gray-500"> • {claim.alamat_penerima}</span>}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-4 pt-1">
                          <span>⏱️ Waktu: {new Date(claim.waktu_klaim).toLocaleDateString('id-ID')} {new Date(claim.waktu_klaim).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          {claim.jarak_antar_lokasi && <span>📍 Jarak: {claim.jarak_antar_lokasi} km</span>}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {claim.no_hp_penerima && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => handleContactWhatsApp(claim.no_hp_penerima, claim.nama_penerima, claim.nama_makanan)}
                          >
                            <Phone className="w-3.5 h-3.5 mr-1" />
                            Hubungi Penerima
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-gray-600 hover:text-gray-900"
                          onClick={() => navigate(`/claim/${claim.id}`)}
                        >
                          Lihat Rute
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>

                        {(claim.status_klaim === "Menunggu" || claim.status_klaim === "Diambil" || claim.status_klaim === "Sedang Diambil") && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                            onClick={() => handlePromptCompleteClaim(claim)}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Konfirmasi Sudah Diambil
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Changing Status to 'Sudah Diambil' / 'Selesai' */}
      <AlertDialog open={isConfirmCompleteOpen} onOpenChange={setIsConfirmCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              Konfirmasi Donasi Sudah Diambil
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-gray-700">
              <p>
                Apakah Anda yakin makanan berikut telah berhasil diserahkan kepada penerima dan selesai diambil?
              </p>
              
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 text-sm text-gray-900 space-y-1">
                {selectedDonationForComplete && (
                  <>
                    <div className="font-bold text-emerald-900">{selectedDonationForComplete.foodType}</div>
                    <div className="text-xs text-gray-600">Jumlah: {selectedDonationForComplete.quantity}</div>
                  </>
                )}
                {selectedClaimForComplete && (
                  <>
                    <div className="font-bold text-emerald-900">{selectedClaimForComplete.nama_makanan}</div>
                    <div className="text-xs text-gray-600">Penerima: {selectedClaimForComplete.nama_penerima}</div>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Setelah dikonfirmasi, status donasi akan berubah dari <b>"Sedang Diambil"</b> menjadi <b>"Sudah Diambil" (Selesai & Terklaim)</b>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isUpdatingStatus} onClick={() => setIsConfirmCompleteOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingStatus}
              onClick={handleExecuteStatusUpdate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
            >
              {isUpdatingStatus ? (
                <>Menyimpan...</>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Ya, Tandai Sudah Diambil
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Donation Cancellation */}
      <AlertDialog open={isConfirmCancelOpen} onOpenChange={setIsConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6 text-red-600" />
              Batalkan Donasi Makanan?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-gray-700">
              <p>
                Apakah Anda yakin ingin membatalkan donasi makanan berikut?
              </p>
              
              {selectedDonationForCancel && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-gray-900 space-y-1">
                  <div className="font-bold text-red-900">{selectedDonationForCancel.foodType}</div>
                  <div className="text-xs text-gray-600">Jumlah: {selectedDonationForCancel.quantity}</div>
                  <div className="text-xs text-gray-600">Status saat ini: {selectedDonationForCancel.status}</div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Makanan yang dibatalkan tidak akan lagi ditampilkan pada rekomendasi penerima dan proses penjemputan akan dihentikan.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isUpdatingStatus} onClick={() => setIsConfirmCancelOpen(false)}>
              Kembali
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingStatus}
              onClick={handleExecuteCancelDonation}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2"
            >
              {isUpdatingStatus ? (
                <>Membatalkan...</>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Ya, Batalkan Donasi
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Location Permission Alert Dialog */}
      <AlertDialog open={isLocationAlertOpen} onOpenChange={setIsLocationAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izinkan Akses Lokasi?</AlertDialogTitle>
            <AlertDialogDescription>
              FoodPriority memerlukan akses lokasi Anda untuk menentukan posisi donasi makanan. Informasi lokasi Anda akan digunakan untuk membantu penerima menemukan donasi dengan lebih mudah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsLocationAlertOpen(false)}>
              Tidak
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLocationAllow}>
              Izinkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}