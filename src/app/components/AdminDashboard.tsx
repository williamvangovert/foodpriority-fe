import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, Package, MapPin, TrendingUp, CheckCircle, XCircle, Settings, FileText, User as UserIcon } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { apiFetch } from "../utils/api";

interface User {
  id: string;
  name: string;
  email?: string;
  username?: string;
  role: "Pendonor" | "Penerima" | "donor" | "recipient";
  status: "Terverifikasi" | "Menunggu" | "Ditolak";
  joinDate: string;
  donations?: number;
}

export default function AdminDashboard() {
  const [sawWeights, setSawWeights] = useState({
    distance: 0.4,
    expiry: 0.60
  });

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalWeight: 0,
    totalUsers: 0,
    donorCount: 0,
    recipientCount: 0,
  });

  const [users, setUsers] = useState<User[]>([]);
  const [dailyDonations, setDailyDonations] = useState<any[]>([]);
  const [locationStats, setLocationStats] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch("/admin/stats");
      
      setStats(data.stats);
      setUsers(data.pendingUsers.map((u: any) => ({
        id: u.id.toString(),
        name: u.name,
        username: u.username,
        role: u.role === "donor" ? "Pendonor" : "Penerima",
        status: u.status,
        joinDate: u.joinDate,
        donations: 0
      })));

      setDailyDonations(data.dailyDonations);
      setLocationStats(data.locationStats);

      setUserStats([
        { name: "Pendonor", value: data.stats.donorCount, color: "#10b981" },
        { name: "Penerima", value: data.stats.recipientCount, color: "#3b82f6" }
      ]);

      // Parse SAW weights
      const weightsObj = { distance: 0.4, expiry: 0.60 };
      data.sawWeights.forEach((w: any) => {
        const name = w.nama_kriteria.toLowerCase();
        if (name === "jarak") weightsObj.distance = w.nilai_bobot;
        if (name === "kadaluwarsa") weightsObj.expiry = w.nilai_bobot;
      });
      setSawWeights(weightsObj);

    } catch (err) {
      console.error("Gagal mengambil data admin:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUserVerification = async (userId: string, status: "Terverifikasi" | "Ditolak") => {
    try {
      const response = await apiFetch(`/admin/users/${userId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      alert(response.message || "Status pengguna berhasil diperbarui!");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Gagal memverifikasi pengguna.");
    }
  };

  const handleSaveWeights = async () => {
    try {
      const response = await apiFetch("/admin/saw-weights", {
        method: "PUT",
        body: JSON.stringify({
          weights: {
            jarak: sawWeights.distance,
            kadaluwarsa: sawWeights.expiry
          }
        })
      });
      alert(response.message || "Bobot kriteria SAW berhasil diperbarui!");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui bobot.");
    }
  };

  const totalWeight = stats.totalWeight;
  const totalDonations = stats.totalDonations;
  const totalUsers = stats.totalUsers;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Admin</h2>
          <p className="text-gray-600">Ikhtisar sistem dan manajemen</p>
        </div>
        
        {/* Profile Section */}
        <Link to="/profile">
          <Card className="w-64 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Admin FoodPriority</h3>
                  <p className="text-sm text-gray-600">@adminmaster</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-xs">admin@foodpriority.id</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">Super Admin</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="users">Pengguna</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          <TabsTrigger value="reports">Laporan</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Donasi</CardTitle>
                <Package className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{totalDonations}</div>
                <p className="text-xs text-gray-500 mt-1">7 hari terakhir</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Berat</CardTitle>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{totalWeight} kg</div>
                <p className="text-xs text-gray-500 mt-1">Makanan terdistribusi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Pengguna</CardTitle>
                <Users className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Akun aktif</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Rata-rata per Hari</CardTitle>
                <Package className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{(totalDonations / 7).toFixed(1)}</div>
                <p className="text-xs text-gray-500 mt-1">Donasi/hari</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Donations Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Tren Donasi Harian</CardTitle>
                <CardDescription>Jumlah donasi dalam 7 hari terakhir</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyDonations}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="donations" stroke="#10b981" strokeWidth={2} name="Donasi" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Pengguna</CardTitle>
                <CardDescription>Pendonor vs Penerima</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userStats.map((entry, index) => (
                        <Cell key={`pie-cell-${entry.name}-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-6">
            {/* Location Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Lokasi Tersibuk</CardTitle>
                <CardDescription>Aktivitas donasi berdasarkan lokasi</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={locationStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="donations" fill="#10b981" name="Donasi" />
                    <Bar dataKey="users" fill="#3b82f6" name="Pengguna Aktif" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verifikasi Pendonor yang Tertunda</CardTitle>
              <CardDescription>Tinjau dan verifikasi akun pendonor baru</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Tanggal Bergabung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.joinDate).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            user.status === "Terverifikasi" 
                              ? "bg-green-100 text-green-800" 
                              : user.status === "Ditolak"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                          variant="secondary"
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.status === "Menunggu" && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUserVerification(user.id, "Terverifikasi")}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verifikasi
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUserVerification(user.id, "Ditolak")}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Tolak
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <CardTitle>Konfigurasi Bobot Kriteria SAW</CardTitle>
              </div>
              <CardDescription>
                Sesuaikan bobot untuk algoritma Simple Additive Weighting yang digunakan dalam rekomendasi penerima
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-2xl">
                {/* Distance Weight */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="distance-weight">Bobot Jarak</Label>
                    <span className="text-sm font-medium">{(sawWeights.distance * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    id="distance-weight"
                    min={0}
                    max={100}
                    step={5}
                    value={[sawWeights.distance * 100]}
                    onValueChange={(value) => setSawWeights({...sawWeights, distance: value[0] / 100})}
                  />
                  <p className="text-xs text-gray-500">Seberapa besar prioritas diberikan pada lokasi makanan terdekat</p>
                </div>

                {/* Expiry Weight */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="expiry-weight">Bobot Waktu Kedaluwarsa</Label>
                    <span className="text-sm font-medium">{(sawWeights.expiry * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    id="expiry-weight"
                    min={0}
                    max={100}
                    step={5}
                    value={[sawWeights.expiry * 100]}
                    onValueChange={(value) => setSawWeights({...sawWeights, expiry: value[0] / 100})}
                  />
                  <p className="text-xs text-gray-500">Seberapa besar prioritas diberikan pada makanan yang akan segera kedaluwarsa</p>
                </div>

                {/* Total Weight Display */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Bobot</span>
                    <span className="text-lg font-bold">
                      {((sawWeights.distance + sawWeights.expiry) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(sawWeights.distance + sawWeights.expiry) === 1 
                      ? "✓ Bobot sudah dinormalisasi dengan benar" 
                      : "⚠️ Peringatan: Total harus sama dengan 100%"}
                  </p>
                </div>

                <Button className="w-full" onClick={handleSaveWeights}>Simpan Konfigurasi</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <CardTitle>Laporan Dampak Sosial</CardTitle>
              </div>
              <CardDescription>Ringkasan distribusi makanan untuk pelaporan skripsi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-green-700 mb-1">Total Makanan Terdistribusi</div>
                    <div className="text-3xl font-bold text-green-900">468 kg</div>
                    <div className="text-xs text-green-600 mt-1">Sepanjang waktu</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-sm text-blue-700 mb-1">Total Porsi Disajikan</div>
                    <div className="text-3xl font-bold text-blue-900">1.872</div>
                    <div className="text-xs text-blue-600 mt-1">Perkiraan makanan</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-purple-700 mb-1">Orang Terdampak</div>
                    <div className="text-3xl font-bold text-purple-900">842</div>
                    <div className="text-xs text-purple-600 mt-1">Penerima unik</div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Rincian berdasarkan Jenis Makanan</h4>
                  <div className="space-y-2">
                    {[
                      { type: "Beras & Biji-bijian", weight: 145, percentage: 31 },
                      { type: "Roti & Kue", weight: 98, percentage: 21 },
                      { type: "Buah & Sayuran", weight: 112, percentage: 24 },
                      { type: "Makanan Kaleng", weight: 76, percentage: 16 },
                      { type: "Produk Susu", weight: 37, percentage: 8 }
                    ].map((item) => (
                      <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">{item.type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">{item.weight} kg</span>
                          <Badge variant="secondary">{item.percentage}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Environmental Impact */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Dampak Lingkungan</h4>
                  <div className="space-y-2 text-sm text-green-800">
                    <div className="flex items-center justify-between">
                      <span>Limbah makanan yang dicegah:</span>
                      <span className="font-semibold">468 kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Perkiraan emisi CO₂ yang dihemat:</span>
                      <span className="font-semibold">~1.170 kg CO₂</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Air yang dihemat (perkiraan):</span>
                      <span className="font-semibold">~2.340 L</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Ekspor Laporan Lengkap (PDF)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}