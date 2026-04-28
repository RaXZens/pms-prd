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
  const [formErrors, setFormErrors] = useState<any>({});

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
    const errors: any = {};
    if (!formData.guestName) errors.guestName = 'Guest name is required.';
    if (!formData.guestPhone) {
      errors.guestPhone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(formData.guestPhone)) {
      errors.guestPhone = 'Phone number must be exactly 10 digits.';
    }
    if (!formData.roomTypeId) errors.roomTypeId = 'Please select a room type.';
    if (!formData.checkIn) errors.checkIn = 'Check-in date required.';
    if (!formData.checkOut) errors.checkOut = 'Check-out date required.';
    
    if (formData.checkIn && formData.checkOut && new Date(formData.checkIn) >= new Date(formData.checkOut)) {
      errors.checkOut = 'Check-out must be after check-in.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    try {
      await apiClient.post('/bookings', formData);
      setShowCreateModal(false);
      setFormData({ roomTypeId: '', checkIn: '', checkOut: '', guestName: '', guestPhone: '' });
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
      <div className="animate-fade-in space-y-8 relative font-sans text-slate-800">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Bookings Management</h1>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-xl px-5 bg-primary hover:bg-primary-light shadow-md font-semibold transition-all duration-300">
            + New Booking
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="border border-slate-100 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100/60 px-8 py-5 bg-slate-50/30">
            <CardTitle className="text-lg font-serif font-bold text-slate-900">Filters</CardTitle>
            <div className="flex flex-row items-center gap-4 w-full sm:w-auto">
              <select 
                className="flex h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <Input 
                type="date" 
                value={filterDate} 
                onChange={e => setFilterDate(e.target.value)} 
                className="rounded-xl border-slate-200 bg-white h-11 px-4 shadow-sm focus-visible:ring-primary/20"
              />
              {(filterStatus || filterDate) && (
                <Button variant="ghost" className="rounded-xl hover:bg-slate-100 text-slate-500 h-11 text-sm font-medium" onClick={() => { setFilterStatus(''); setFilterDate(''); }}>Clear</Button>
              )}
            </div>
          </CardHeader>

          {/* Bookings Table */}
          <CardContent className="p-0">
            {loading ? (
              <p className="text-slate-400 py-16 text-center text-sm">Loading bookings...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 tracking-wider">
                    <tr>
                      <th className="px-8 py-4">Guest</th>
                      <th className="px-8 py-4">Room Type</th>
                      <th className="px-8 py-4">Dates</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Payment</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentItems.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                        <td className="px-8 py-5 font-bold text-slate-900 whitespace-nowrap">
                          {b.guestName} 
                          <div className="text-slate-400 font-normal text-xs mt-0.5">{b.guestPhone}</div>
                        </td>
                        <td className="px-8 py-5 text-slate-600">{b.roomType?.name || 'Unknown'}</td>
                        <td className="px-8 py-5 whitespace-nowrap text-slate-500">
                          {new Date(b.checkIn).toLocaleDateString()} 
                          <span className="text-slate-300 mx-2">→</span> 
                          {new Date(b.checkOut).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center justify-center w-28 border ${
                            b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            b.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center justify-center w-24 border ${
                            b.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right space-x-2 whitespace-nowrap">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 h-9 font-medium"
                            onClick={() => {
                              setFormData({
                                roomTypeId: b.roomTypeId,
                                checkIn: new Date(b.checkIn).toISOString().split('T')[0],
                                checkOut: new Date(b.checkOut).toISOString().split('T')[0],
                                guestName: b.guestName,
                                guestPhone: b.guestPhone
                              });
                              setShowEditModal(b);
                            }}
                          >
                            Edit
                          </Button>
                          {b.paymentStatus !== 'PAID' && b.status !== 'CANCELLED' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 h-9 font-medium"
                              onClick={() => handleStatusUpdate(b.id, 'CONFIRMED', 'PAID')}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {b.status !== 'CANCELLED' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 h-9 font-medium"
                              onClick={() => handleStatusUpdate(b.id, 'CANCELLED')}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-8 py-16 text-center text-slate-400 text-sm">No bookings match your criteria</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-slate-400 font-medium">
                      Showing Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-slate-200 h-9 font-medium text-slate-600 hover:bg-slate-100"
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-slate-200 h-9 font-medium text-slate-600 hover:bg-slate-100"
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
                {formErrors.guestName && <p className="text-xs text-red-500 mt-1">{formErrors.guestName}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Guest Phone</label>
                <Input disabled={!!showEditModal} type="text" maxLength={10} value={formData.guestPhone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData({...formData, guestPhone: val}) }} className="rounded-xl" placeholder="0XXXXXXXXX" />
                {formErrors.guestPhone && <p className="text-xs text-red-500 mt-1">{formErrors.guestPhone}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Room Type</label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  value={formData.roomTypeId} onChange={e => setFormData({...formData, roomTypeId: e.target.value})}>
                  <option value="">Select Room</option>
                  {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
                {formErrors.roomTypeId && <p className="text-xs text-red-500 mt-1">{formErrors.roomTypeId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Check In</label>
                  <Input type="date" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="rounded-xl" />
                  {formErrors.checkIn && <p className="text-xs text-red-500 mt-1">{formErrors.checkIn}</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Check Out</label>
                  <Input type="date" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="rounded-xl" />
                  {formErrors.checkOut && <p className="text-xs text-red-500 mt-1">{formErrors.checkOut}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button variant="ghost" className="rounded-xl px-5" onClick={() => { setShowCreateModal(false); setShowEditModal(null); setFormErrors({}); }}>Cancel</Button>
                <Button className="rounded-xl px-5 shadow-md" onClick={showCreateModal ? handleCreate : handleEdit}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
