'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', maxOccupancy: 2, totalUnits: 10, imageUrls: '',
  });

  const loadData = () => {
    setLoading(true);
    apiClient.get('/room-types')
      .then(data => { setRooms(data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
        maxOccupancy: parseInt(formData.maxOccupancy as any),
        totalUnits: parseInt(formData.totalUnits as any),
        imageUrls: formData.imageUrls ? formData.imageUrls.split(',').map(url => url.trim()) : [],
      };
      if (editingRoom) await apiClient.put(`/room-types/${editingRoom.id}`, payload);
      else await apiClient.post('/room-types', payload);
      setShowModal(false);
      loadData();
    } catch {
      setErrorMsg('Failed to save room type. Please ensure required data is present.');
    }
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    setErrorMsg('');
    try {
      await apiClient.delete(`/room-types/${roomToDelete}`);
      setShowDeleteModal(false);
      setRoomToDelete(null);
      loadData();
    } catch {
      setErrorMsg('Cannot delete room type. Check if there are active bookings.');
      setShowDeleteModal(false);
      setRoomToDelete(null);
    }
  };

  const openModal = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setFormData({ name: room.name, description: room.description || '', maxOccupancy: room.maxOccupancy, totalUnits: room.totalUnits, imageUrls: room.imageUrls?.join(', ') || '' });
    } else {
      setEditingRoom(null);
      setFormData({ name: '', description: '', maxOccupancy: 2, totalUnits: 10, imageUrls: '' });
    }
    setShowModal(true);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Room Types</h1>
          <Button onClick={() => openModal()} className="rounded-lg px-4 shadow-sm font-semibold">+ Add Room Type</Button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400 text-sm py-12 text-center">Loading room types...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rooms.map(room => (
              <Card key={room.id} className="border border-slate-100 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                {room.imageUrls?.[0] ? (
                  <div className="h-44 overflow-hidden bg-slate-100">
                    <img src={room.imageUrls[0]} alt={room.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="h-44 bg-slate-50 flex items-center justify-center text-slate-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </div>
                )}
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-base mb-1">{room.name}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-4">{room.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{room.totalUnits} units</Badge>
                      <Badge variant="secondary">Max {room.maxOccupancy} guests</Badge>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs border-slate-200" onClick={() => openModal(room)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="rounded-lg h-8 text-xs text-red-500 hover:bg-red-50" onClick={() => { setRoomToDelete(room.id); setShowDeleteModal(true); }}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rooms.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-400 text-sm">
                No room types found. Create one to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room Type' : 'Create Room Type'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="maxOccupancy">Max Occupancy</Label>
                <Input id="maxOccupancy" type="number" min="1" value={formData.maxOccupancy} onChange={e => setFormData({ ...formData, maxOccupancy: parseInt(e.target.value) })} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="totalUnits">Total Units</Label>
                <Input id="totalUnits" type="number" min="1" value={formData.totalUnits} onChange={e => setFormData({ ...formData, totalUnits: parseInt(e.target.value) })} className="rounded-lg" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imageUrls">Image URLs <span className="text-slate-400 font-normal">(comma-separated)</span></Label>
              <Input id="imageUrls" value={formData.imageUrls} onChange={e => setFormData({ ...formData, imageUrls: e.target.value })} placeholder="https://..., https://..." className="rounded-lg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-lg" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="rounded-lg shadow-sm" onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) { setShowDeleteModal(false); setRoomToDelete(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <div className="px-6 pt-8 pb-2 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Room Type?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">This action cannot be undone and will fail if active bookings exist.</p>
            </div>
          </div>
          <DialogFooter className="justify-center gap-3">
            <Button variant="outline" className="rounded-full px-6" onClick={() => { setShowDeleteModal(false); setRoomToDelete(null); }}>Cancel</Button>
            <Button className="rounded-full px-6 bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
