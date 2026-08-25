import { useState, useEffect } from "react";
import { Plus, Package, Users, TrendingUp, Clock, CheckCircle, Upload, User as UserIcon, MapPin } from "lucide-react";
import { Link } from "react-router";
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
import { apiFetch } from "../utils/api";

interface Donation {
  id: string;
  foodType: string;
  quantity: string;
  stock: number;
  status: "Tersedia" | "Sedang Diambil" | "Selesai";
  expiryDate: string;
  createdAt: string;
}

export default function DonorDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLocationAlertOpen, setIsLocationAlertOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [user] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : { nama_lengkap: "Restoran Lokal", username: "restlokal", no_hp: "-", alamat: "-" };
  });

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
        createdAt: d.waktu_input
      }));
      setDonations(mapped);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat donasi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
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
          console.warn("Error getting location, using default location (Jakarta):", error);
          const defaultLoc = { lat: -6.2088, lng: 106.8456 };
          setCoords(defaultLoc);
          setCurrentLocation(`${defaultLoc.lat.toFixed(6)}, ${defaultLoc.lng.toFixed(6)}`);
          setIsLocationAlertOpen(false);
          alert(`Lokasi disetel ke default (Jakarta) karena GPS tidak aktif/diizinkan.\nKoordinat: ${defaultLoc.lat.toFixed(6)}, ${defaultLoc.lng.toFixed(6)}`);
        }
      );
    } else {
      const defaultLoc = { lat: -6.2088, lng: 106.8456 };
      setCoords(defaultLoc);
      setCurrentLocation(`${defaultLoc.lat.toFixed(6)}, ${defaultLoc.lng.toFixed(6)}`);
      setIsLocationAlertOpen(false);
      alert(`Lokasi disetel ke default (Jakarta) karena Geolocation tidak didukung.\nKoordinat: ${defaultLoc.lat.toFixed(6)}, ${defaultLoc.lng.toFixed(6)}`);
    }
  };

  const stats = {
    totalDonated: donations.reduce((sum, d) => sum + d.stock, 0),
    peopleHelped: donations.filter(d => d.status === "Selesai").length * 5, // Estimated people helped
    activeDonations: donations.filter(d => d.status === "Tersedia").length
  };

  const getStatusColor = (status: Donation["status"]) => {
    switch (status) {
      case "Tersedia":
        return "bg-green-100 text-green-800";
      case "Sedang Diambil":
        return "bg-yellow-100 text-yellow-800";
      case "Selesai":
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Donatur</h2>
          <p className="text-gray-600">Kelola donasi makanan Anda dan pantau dampaknya</p>
        </div>
        
        {/* Profile Section */}
        <Link to="/profile">
          <Card className="w-64 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-green-600" />
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Makanan Didonasikan</CardTitle>
            <Package className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalDonated} kg</div>
            <p className="text-xs text-gray-500 mt-1">Donasi sepanjang waktu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Orang Terbantu</CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.peopleHelped}</div>
            <p className="text-xs text-gray-500 mt-1">Penerima yang dilayani</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Donasi Aktif</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.activeDonations}</div>
            <p className="text-xs text-gray-500 mt-1">Saat ini tersedia</p>
          </CardContent>
        </Card>
      </div>

      {/* Main CTA Button */}
      <div className="mb-8">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full md:w-auto">
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
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  placeholder="contoh: 5 kg, 10 buah"
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
                <Button type="submit">Kirim Donasi</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Donations List */}
      <Card>
        <CardHeader>
          <CardTitle>Donasi Saya</CardTitle>
          <CardDescription>Lacak status donasi makanan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Makanan</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Tanggal Kedaluwarsa</TableHead>
                  <TableHead>Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="font-medium">{donation.foodType}</TableCell>
                    <TableCell>{donation.quantity}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(donation.status)} variant="secondary">
                        {donation.status === "Tersedia" && <Clock className="w-3 h-3 mr-1" />}
                        {donation.status === "Selesai" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {donation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Package className="w-3 h-3" />
                        {donation.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(donation.expiryDate).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>{new Date(donation.createdAt).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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