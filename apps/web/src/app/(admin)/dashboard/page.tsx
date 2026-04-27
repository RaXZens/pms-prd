'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect } from 'react';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    todayCheckIns: 0,
    pendingBookings: 0,
    occupancyRate: 0,
    totalRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/bookings'),
      apiClient.get('/room-types'),
    ]).then(([bookings, roomTypes]) => {
      const today = new Date().toISOString().split('T')[0];
      
      const checkIns = bookings.filter((b: any) => 
        new Date(b.checkIn).toISOString().split('T')[0] === today && b.status !== 'CANCELLED'
      ).length;

      const pendings = bookings.filter((b: any) => b.status === 'PENDING').length;

      const totalRooms = roomTypes.reduce((acc: number, rt: any) => acc + rt.totalUnits, 0);
      const activeBookings = bookings.filter((b: any) => {
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        const now = new Date();
        return now >= bIn && now < bOut && b.status === 'CONFIRMED';
      }).length;

      const occupancy = totalRooms > 0 ? Math.round((activeBookings / totalRooms) * 100) : 0;

      // Calculate total revenue from PAID or CONFIRMED bookings
      const revenue = bookings
        .filter((b: any) => b.paymentStatus === 'PAID' && b.status !== 'CANCELLED')
        .reduce((acc: number, b: any) => acc + Number(b.totalPrice), 0);

      setStats({
        todayCheckIns: checkIns,
        pendingBookings: pendings,
        occupancyRate: occupancy,
        totalRevenue: revenue,
      });

      // Sort and grab 5 most recent
      const sorted = [...bookings]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentBookings(sorted);

      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-400">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {loading ? '...' : `฿${stats.totalRevenue.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-400">Today's Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {loading ? '...' : stats.todayCheckIns}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-400">Pending Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {loading ? '...' : stats.pendingBookings}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-400">Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {loading ? '...' : `${stats.occupancyRate}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 py-4">Loading data...</p>
          ) : recentBookings.length === 0 ? (
            <p className="text-gray-500 py-4">No recent bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Guest Name</th>
                    <th scope="col" className="px-6 py-3">Room Type</th>
                    <th scope="col" className="px-6 py-3">Dates</th>
                    <th scope="col" className="px-6 py-3">Price</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <th scope="row" className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                        {b.guestName}
                      </th>
                      <td className="px-6 py-4">{b.roomType?.name || 'Unknown'}</td>
                      <td className="px-6 py-4">{new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">฿{Number(b.totalPrice).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          b.status === 'CONFIRMED' ? 'bg-green-50 text-green-700' :
                          b.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
