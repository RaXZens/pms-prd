'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    roomTypeId: '',
    checkIn: '',
    checkOut: '',
    guestName: '',
    guestPhone: '',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/bookings/admin/all'),
      apiClient.get('/room-types')
    ]).then(([bData, rtData]) => {
      setBookings(bData);
      setRoomTypes(rtData);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!formData.roomTypeId) {
      alert('Please select a room type.');
      return;
    }
    try {
      await apiClient.post('/bookings', formData);
      setShowCreateModal(false);
      loadData();
    } catch (e) {
      alert('Failed to create booking');
    }
  };

  const handleEdit = async () => {
    try {
      await apiClient.put(`/bookings/${showEditModal.id}/details`, {
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        roomTypeId: formData.roomTypeId,
      });
      setShowEditModal(null);
      loadData();
    } catch (e) {
      alert('Failed to update booking');
    }
  };

  const handleStatusUpdate = async (id: string, status: string, paymentStatus?: string) => {
    try {
      await apiClient.put(`/bookings/${id}/status`, { status, paymentStatus });
      loadData();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterDate]);

  const filteredBookings = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterDate) {
      const bDate = new Date(b.checkIn).toISOString().split('T')[0];
      if (bDate !== filterDate) return false;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  return (
    <>
      <div className="animate-fade-in space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <Button onClick={() => setShowCreateModal(true)}>+ New Booking</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <div className="flex gap-4">
            <select className="border p-2 rounded" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            {(filterStatus || filterDate) && (
              <Button variant="ghost" onClick={() => { setFilterStatus(''); setFilterDate(''); }}>Clear</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-gray-500 py-4">Loading bookings...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Guest</th>
                    <th className="px-6 py-3">Room Type</th>
                    <th className="px-6 py-3">Dates</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map(b => (
                    <tr key={b.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{b.guestName} <br/><span className="text-gray-400 font-normal">{b.guestPhone}</span></td>
                      <td className="px-6 py-4">{b.roomType?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(b.checkIn).toLocaleDateString()} <br/>to {new Date(b.checkOut).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                          b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded text-xs font-medium ${b.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.paymentStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => {
                          setFormData({
                            roomTypeId: b.roomTypeId,
                            checkIn: new Date(b.checkIn).toISOString().split('T')[0],
                            checkOut: new Date(b.checkOut).toISOString().split('T')[0],
                            guestName: b.guestName,
                            guestPhone: b.guestPhone
                          });
                          setShowEditModal(b);
                        }}>Edit</Button>
                        {b.paymentStatus !== 'PAID' && b.status !== 'CANCELLED' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(b.id, 'CONFIRMED', 'PAID')}>Mark Paid</Button>
                        )}
                        {b.status !== 'CANCELLED' && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleStatusUpdate(b.id, 'CANCELLED')}>Cancel</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No bookings match criteria</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/50">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing Page <span className="font-bold text-gray-900">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === totalPages} 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      </div>

      {/* Modals */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-fade-in-up border-none shadow-2xl">
            <CardHeader className="border-b pb-4 mb-4">
              <CardTitle className="text-xl font-bold">{showCreateModal ? 'Create Manual Booking' : 'Edit Booking'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Guest Name</label>
                <Input disabled={!!showEditModal} value={formData.guestName} onChange={e => setFormData({...formData, guestName: e.target.value})} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Guest Phone</label>
                <Input disabled={!!showEditModal} value={formData.guestPhone} onChange={e => setFormData({...formData, guestPhone: e.target.value})} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Room Type</label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={formData.roomTypeId} onChange={e => setFormData({...formData, roomTypeId: e.target.value})}>
                  <option value="">Select Room</option>
                  {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Check In</label>
                  <Input type="date" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Check Out</label>
                  <Input type="date" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="rounded-xl" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button variant="ghost" className="rounded-xl px-5" onClick={() => { setShowCreateModal(false); setShowEditModal(null); }}>Cancel</Button>
                <Button className="rounded-xl px-5 shadow-md" onClick={showCreateModal ? handleCreate : handleEdit}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
