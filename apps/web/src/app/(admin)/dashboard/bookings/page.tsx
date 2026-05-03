'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';


function statusVariant(status: string) {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'PENDING') return 'warning';
  return 'destructive';
}

function paymentVariant(ps: string) {
  return ps === 'PAID' ? 'success' : 'destructive';
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);

  const [formData, setFormData] = useState({
    roomTypeId: '', checkIn: '', checkOut: '', guestName: '', guestPhone: '',
  });
  const [formErrors, setFormErrors] = useState<any>({});

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/bookings/admin/all'),
      apiClient.get('/room-types'),
    ]).then(([bData, rtData]) => {
      setBookings(bData);
      setRoomTypes(rtData);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterDate]);

  const handleCreate = async () => {
    const errors: any = {};
    if (!formData.guestName) errors.guestName = 'Guest name is required.';
    if (!formData.guestPhone) errors.guestPhone = 'Phone number is required.';
    else if (!/^\d{10}$/.test(formData.guestPhone)) errors.guestPhone = 'Must be exactly 10 digits.';
    if (!formData.roomTypeId) errors.roomTypeId = 'Please select a room type.';
    if (!formData.checkIn) errors.checkIn = 'Check-in date required.';
    if (!formData.checkOut) errors.checkOut = 'Check-out date required.';
    if (formData.checkIn && formData.checkOut && new Date(formData.checkIn) >= new Date(formData.checkOut))
      errors.checkOut = 'Check-out must be after check-in.';

    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    try {
      await apiClient.post('/bookings', formData);
      setShowCreateModal(false);
      setFormData({ roomTypeId: '', checkIn: '', checkOut: '', guestName: '', guestPhone: '' });
      loadData();
    } catch { alert('Failed to create booking'); }
  };

  const handleEdit = async () => {
    try {
      await apiClient.put(`/bookings/${showEditModal.id}/details`, {
        checkIn: formData.checkIn, checkOut: formData.checkOut, roomTypeId: formData.roomTypeId,
      });
      setShowEditModal(null);
      loadData();
    } catch { alert('Failed to update booking'); }
  };

  const handleStatusUpdate = async (id: string, status: string, paymentStatus?: string) => {
    try {
      await apiClient.put(`/bookings/${id}/status`, { status, paymentStatus });
      loadData();
    } catch { alert('Failed to update status'); }
  };

  const filteredBookings = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterDate && new Date(b.checkIn).toISOString().split('T')[0] !== filterDate) return false;
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredBookings.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);


  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-lg px-4 shadow-sm font-semibold">
            + New Booking
          </Button>
        </div>

        {/* Filters + Table */}
        <Card className="border border-slate-100 bg-white rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-base font-semibold text-slate-700">All Bookings</CardTitle>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40 h-9 text-xs">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-9 text-xs rounded-lg border-slate-200 w-40" />
              {(filterStatus || filterDate) && (
                <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-400 hover:text-slate-700" onClick={() => { setFilterStatus(''); setFilterDate(''); }}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <p className="text-slate-400 py-16 text-center text-sm">Loading bookings...</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map(b => {
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                            {b.guestName}
                            <div className="text-slate-400 font-normal text-xs mt-0.5">{b.guestPhone}</div>
                          </TableCell>
                          <TableCell className="text-slate-600">{b.roomType?.name || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                            {new Date(b.checkIn).toLocaleDateString()}
                            <span className="text-slate-300 mx-1">→</span>
                            {new Date(b.checkOut).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">฿{Number(b.totalPrice).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(b.status) as any}>{b.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={paymentVariant(b.paymentStatus) as any}>{b.paymentStatus}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1 whitespace-nowrap">
                            <Button
                              variant="outline" size="sm"
                              className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 h-8 text-xs font-medium"
                              onClick={() => {
                                setFormData({
                                  roomTypeId: b.roomTypeId,
                                  checkIn: new Date(b.checkIn).toISOString().split('T')[0],
                                  checkOut: new Date(b.checkOut).toISOString().split('T')[0],
                                  guestName: b.guestName,
                                  guestPhone: b.guestPhone,
                                });
                                setShowEditModal(b);
                              }}
                            >
                              Edit
                            </Button>
                            {b.paymentStatus !== 'PAID' && b.status !== 'CANCELLED' && (
                              <Button
                                variant="outline" size="sm"
                                className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8 text-xs font-medium"
                                onClick={() => handleStatusUpdate(b.id, 'CONFIRMED', 'PAID')}
                              >
                                Mark Paid
                              </Button>
                            )}
                            {b.status !== 'CANCELLED' && (
                              <Button
                                variant="ghost" size="sm"
                                className="rounded-lg text-red-500 hover:bg-red-50 h-8 text-xs font-medium"
                                onClick={() => handleStatusUpdate(b.id, 'CANCELLED')}
                              >
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredBookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-16 text-center text-slate-400">No bookings match your criteria</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-slate-400">
                      Page <span className="font-bold text-slate-700">{currentPage}</span> of <span className="font-bold text-slate-700">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>Previous</Button>
                      <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateModal || !!showEditModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); setShowEditModal(null); setFormErrors({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{showCreateModal ? 'Create Manual Booking' : 'Edit Booking'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="guestName">Guest Name</Label>
              <Input id="guestName" disabled={!!showEditModal} value={formData.guestName} onChange={e => setFormData({ ...formData, guestName: e.target.value })} className="rounded-lg" />
              {formErrors.guestName && <p className="text-xs text-red-500">{formErrors.guestName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guestPhone">Guest Phone</Label>
              <Input id="guestPhone" disabled={!!showEditModal} type="text" maxLength={10} value={formData.guestPhone} onChange={e => setFormData({ ...formData, guestPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="rounded-lg" placeholder="0XXXXXXXXX" />
              {formErrors.guestPhone && <p className="text-xs text-red-500">{formErrors.guestPhone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roomType">Room Type</Label>
              <Select id="roomType" value={formData.roomTypeId} onChange={e => setFormData({ ...formData, roomTypeId: e.target.value })}>
                <option value="">Select Room</option>
                {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </Select>
              {formErrors.roomTypeId && <p className="text-xs text-red-500">{formErrors.roomTypeId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="checkIn">Check In</Label>
                <Input id="checkIn" type="date" value={formData.checkIn} onChange={e => setFormData({ ...formData, checkIn: e.target.value })} className="rounded-lg" />
                {formErrors.checkIn && <p className="text-xs text-red-500">{formErrors.checkIn}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkOut">Check Out</Label>
                <Input id="checkOut" type="date" value={formData.checkOut} onChange={e => setFormData({ ...formData, checkOut: e.target.value })} className="rounded-lg" />
                {formErrors.checkOut && <p className="text-xs text-red-500">{formErrors.checkOut}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-lg" onClick={() => { setShowCreateModal(false); setShowEditModal(null); setFormErrors({}); }}>Cancel</Button>
            <Button className="rounded-lg shadow-sm" onClick={showCreateModal ? handleCreate : handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
