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
    <div className="animate-fade-in space-y-6">
      <h1 className="text-3xl font-bold">Rate & Availability Calendar</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Room Selection</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <p>Loading...</p> : (
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedRoom} 
                  onChange={e => setSelectedRoom(e.target.value)}
                >
                  {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Rate Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  value={bulkData.startDate} 
                  onChange={e => setBulkData({...bulkData, startDate: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input 
                  type="date" 
                  disabled={!bulkData.startDate}
                  min={bulkData.startDate ? new Date(new Date(bulkData.startDate).getTime() + 86400000).toISOString().split('T')[0] : ''}
                  value={bulkData.endDate} 
                  onChange={e => setBulkData({...bulkData, endDate: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nightly Rate (฿)</label>
                <Input type="number" min="0" value={bulkData.price} onChange={e => setBulkData({...bulkData, price: e.target.value})} />
              </div>

              {errorMsg && (
                <p className="text-red-500 text-sm font-medium animate-fade-in">⚠️ {errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-emerald-600 text-sm font-medium animate-fade-in">✅ {successMsg}</p>
              )}

              <Button className="w-full shadow-md hover:shadow-lg transition-all" onClick={handleBulkUpdate}>Apply Rates</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Next 30 Days Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                  
                  // Count overlapping bookings for this date (timezone-agnostic)
                  const bookedUnits = bookings.filter(b => {
                    const bInStr = b.checkIn.includes('T') ? b.checkIn.split('T')[0] : b.checkIn;
                    const bOutStr = b.checkOut.includes('T') ? b.checkOut.split('T')[0] : b.checkOut;
                    return dStr >= bInStr && dStr < bOutStr;
                  }).length;

                  const isSoldOut = bookedUnits >= totalUnits;

                  return (
                    <div key={i} className={`border rounded-lg p-3 text-center flex flex-col justify-center items-center h-28 transition-all ${isSoldOut ? 'bg-red-50/50 border-red-200' : 'bg-gray-50'}`}>
                      <div className="text-xs text-gray-500 font-medium mb-1">{d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      {rateObj ? (
                        <div className="font-bold text-primary text-base">฿{rateObj.price}</div>
                      ) : (
                        <div className="text-xs text-red-400 italic">No rate set</div>
                      )}
                      
                      {totalUnits > 0 && (
                        <div className={`text-[10px] mt-2 font-semibold px-2 py-0.5 rounded-full ${isSoldOut ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
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
