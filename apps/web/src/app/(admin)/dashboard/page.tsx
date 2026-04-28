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
    <div className="space-y-8 animate-fade-in font-sans text-slate-800">
      
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-[#7c3aed] rounded-3xl p-8 text-white shadow-lg shadow-primary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight mb-2">Welcome back, Admin</h1>
          <p className="text-white/80 text-sm font-medium">Here's a performance overview of your luxury properties today.</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2 border border-white/10 shadow-inner">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Analytics
        </div>
      </div>

      {/* 2. Top Tier Cards (Asymmetric Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Large Revenue Card (Span 2) */}
        <Card className="lg:col-span-2 border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 p-8 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute right-[-5%] bottom-[-15%] w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Gross Operational Revenue</span>
            <div className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mt-4 flex flex-wrap items-baseline gap-3">
              {loading ? '...' : `฿${stats.totalRevenue.toLocaleString()}`}
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                <span className="text-sm">↑</span> Healthy Revenue
              </span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <div>
              <span className="font-bold text-slate-900 text-base">{stats.occupancyRate}%</span> Average Occupancy
            </div>
            <div className="flex gap-2 text-slate-400 font-medium">
              <span>Bookings tracked: <strong className="text-slate-700 font-bold">{recentBookings.length}</strong></span>
            </div>
          </div>
        </Card>

        {/* Occupancy Rate Gauge (Span 1) */}
        <Card className="lg:col-span-1 border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 p-8 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-6">Occupancy Rate</span>
          
          {/* Circular SVG Gauge */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="60" stroke="#f8fafc" strokeWidth="12" fill="transparent" />
              <circle 
                cx="72" 
                cy="72" 
                r="60" 
                stroke="url(#gradient-occ)" 
                strokeWidth="12" 
                fill="transparent" 
                strokeDasharray={`${2 * Math.PI * 60}`} 
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - (loading ? 0 : stats.occupancyRate) / 100)}`}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient-occ" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-3xl font-serif font-bold text-slate-900">
              {loading ? '...' : `${stats.occupancyRate}%`}
            </div>
          </div>
          
          <p className="text-slate-400 text-xs font-medium mt-6 leading-relaxed">Capacity currently booked across all units.</p>
        </Card>
      </div>

      {/* 3. Operational Stats (Smaller Row Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Today's Check-ins */}
        <Card className="border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 p-6 flex items-center gap-6">
          <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl flex-shrink-0">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Today's Check-ins</span>
            <div className="text-3xl font-bold text-slate-900 mt-1">
              {loading ? '...' : stats.todayCheckIns}
            </div>
          </div>
        </Card>

        {/* Pending Bookings */}
        <Card className="border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 p-6 flex items-center gap-6">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl flex-shrink-0">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Pending Reservations</span>
            <div className="text-3xl font-bold text-amber-600 mt-1">
              {loading ? '...' : stats.pendingBookings}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Bookings Table */}
      <Card className="border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <CardHeader className="border-b border-slate-100/60 px-8 py-6">
          <CardTitle className="text-xl font-serif font-bold text-slate-900">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-slate-400 py-12 text-center">Loading data...</p>
          ) : recentBookings.length === 0 ? (
            <p className="text-slate-400 py-12 text-center">No recent bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 tracking-wider">
                  <tr>
                    <th scope="col" className="px-8 py-4">Guest Name</th>
                    <th scope="col" className="px-8 py-4">Room Type</th>
                    <th scope="col" className="px-8 py-4">Dates</th>
                    <th scope="col" className="px-8 py-4">Price</th>
                    <th scope="col" className="px-8 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <th scope="row" className="px-8 py-5 font-bold text-slate-900 whitespace-nowrap">
                        {b.guestName}
                      </th>
                      <td className="px-8 py-5 text-slate-600">{b.roomType?.name || 'Unknown'}</td>
                      <td className="px-8 py-5 text-slate-500 whitespace-nowrap">
                        {new Date(b.checkIn).toLocaleDateString()} <span className="text-slate-300 mx-1">→</span> {new Date(b.checkOut).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-900">฿{Number(b.totalPrice).toLocaleString()}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center justify-center w-24 border ${
                          b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          b.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
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
