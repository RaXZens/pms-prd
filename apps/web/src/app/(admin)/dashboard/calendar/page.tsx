'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function CalendarPage() {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  
  const [bulkData, setBulkData] = useState({
    startDate: '',
    endDate: '',
    price: '',
  });

  const [calendarDates, setCalendarDates] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    apiClient.get('/room-types').then(data => {
      setRoomTypes(data);
      if (data.length > 0) {
        setSelectedRoom(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  const loadCalendar = async () => {
    if (!selectedRoom) return;
    
    // Load next 30 days
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    
    try {
      const ratesRes = await apiClient.get(`/rate-calendar?roomTypeId=${selectedRoom}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      setCalendarDates(ratesRes);
      
      const bookingsRes = await apiClient.get(`/bookings`);
      setBookings(bookingsRes.filter((b: any) => b.roomTypeId === selectedRoom && b.status === 'CONFIRMED'));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      loadCalendar();
    }
  }, [selectedRoom]);

  const handleBulkUpdate = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!bulkData.startDate || !bulkData.endDate || !bulkData.price) {
      setErrorMsg('Please fill all fields');
      return;
    }
    
    if (new Date(bulkData.startDate) > new Date(bulkData.endDate)) {
      setErrorMsg('End date must be after start date.');
      return;
    }

    try {
      await apiClient.put('/rate-calendar/bulk', {
        roomTypeId: selectedRoom,
        startDate: bulkData.startDate,
        endDate: bulkData.endDate,
        price: parseFloat(bulkData.price),
      });
      setSuccessMsg('Rates updated successfully');
      setBulkData({ startDate: '', endDate: '', price: '' });
      loadCalendar();
    } catch (e) {
      setErrorMsg('Failed to update rates. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in space-y-8 font-sans text-slate-800">
      <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Rate & Availability Calendar</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Card 1: Room Selection */}
          <Card className="border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-slate-100/60 px-8 py-5">
              <CardTitle className="text-lg font-serif font-bold text-slate-900">Room Selection</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              {loading ? <p className="text-slate-400 text-center py-4">Loading...</p> : (
                <select 
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  value={selectedRoom} 
                  onChange={e => setSelectedRoom(e.target.value)}
                >
                  {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Bulk Update */}
          <Card className="border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-slate-100/60 px-8 py-5">
              <CardTitle className="text-lg font-serif font-bold text-slate-900">Bulk Rate Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-8 pt-6">
              <div>
                <label className="text-sm font-semibold tracking-wide text-slate-500 uppercase block mb-1">Start Date</label>
                <Input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  value={bulkData.startDate} 
                  onChange={e => setBulkData({...bulkData, startDate: e.target.value})} 
                  className="rounded-xl border-slate-200 h-11 focus-visible:ring-primary/20 shadow-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold tracking-wide text-slate-500 uppercase block mb-1">End Date</label>
                <Input 
                  type="date" 
                  disabled={!bulkData.startDate}
                  min={bulkData.startDate ? new Date(new Date(bulkData.startDate).getTime() + 86400000).toISOString().split('T')[0] : ''}
                  value={bulkData.endDate} 
                  onChange={e => setBulkData({...bulkData, endDate: e.target.value})} 
                  className="rounded-xl border-slate-200 h-11 focus-visible:ring-primary/20 shadow-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold tracking-wide text-slate-500 uppercase block mb-1">Nightly Rate (฿)</label>
                <Input 
                  type="number" 
                  min="0" 
                  value={bulkData.price} 
                  onChange={e => setBulkData({...bulkData, price: e.target.value})} 
                  className="rounded-xl border-slate-200 h-11 focus-visible:ring-primary/20 shadow-sm"
                  placeholder="e.g. 2500"
                />
              </div>

              {errorMsg && (
                <p className="text-red-500 text-sm font-medium animate-fade-in flex items-center gap-2">⚠️ {errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-emerald-600 text-sm font-medium animate-fade-in flex items-center gap-2">✅ {successMsg}</p>
              )}

              <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary-light text-primary-foreground font-semibold shadow-md hover:shadow-primary/20 transition-all duration-300 mt-2" onClick={handleBulkUpdate}>
                Apply Rates
              </Button>
            </CardContent>
          </Card>

        </div>

        <div className="lg:col-span-2">
          <Card className="border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-slate-100/60 px-8 py-5">
              <CardTitle className="text-lg font-serif font-bold text-slate-900">Next 30 Days Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 30 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const rateObj = calendarDates.find(c => {
                    const cDateStr = c.date.includes('T') ? c.date.split('T')[0] : c.date;
                    return cDateStr === dStr;
                  });
                  
                  const currentRoom = roomTypes.find(r => r.id === selectedRoom);
                  const totalUnits = currentRoom?.totalUnits || 0;
                  
                  const bookedUnits = bookings.filter(b => {
                    const bInStr = b.checkIn.includes('T') ? b.checkIn.split('T')[0] : b.checkIn;
                    const bOutStr = b.checkOut.includes('T') ? b.checkOut.split('T')[0] : b.checkOut;
                    return dStr >= bInStr && dStr < bOutStr;
                  }).length;

                  const isSoldOut = bookedUnits >= totalUnits;

                  return (
                    <div 
                      key={i} 
                      className={`rounded-2xl p-4 text-center flex flex-col justify-center items-center h-32 transition-all duration-300 border ${
                        isSoldOut 
                          ? 'bg-red-50/40 border-red-100 hover:shadow-md hover:border-red-200' 
                          : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200'
                      }`}
                    >
                      <div className="text-xs text-slate-400 font-bold tracking-wide mb-1">
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      {rateObj ? (
                        <div className="font-bold text-slate-900 text-lg">฿{rateObj.price}</div>
                      ) : (
                        <div className="text-xs text-red-400 font-medium italic mt-0.5">No rate set</div>
                      )}
                      
                      {totalUnits > 0 && (
                        <div className={`text-[10px] mt-3 font-bold px-2 py-1 rounded-full border ${
                          isSoldOut 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isSoldOut ? 'Sold Out' : `Avail: ${totalUnits - bookedUnits}/${totalUnits}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
