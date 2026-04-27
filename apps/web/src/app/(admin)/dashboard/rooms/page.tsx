'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    name: '',
    description: '',
    maxOccupancy: 2,
    totalUnits: 10,
    imageUrls: '',
  });

  const loadData = () => {
    setLoading(true);
    apiClient.get('/room-types').then(data => {
      setRooms(data);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
        maxOccupancy: parseInt(formData.maxOccupancy as any),
        totalUnits: parseInt(formData.totalUnits as any),
        imageUrls: formData.imageUrls ? formData.imageUrls.split(',').map(url => url.trim()) : [],
      };
      if (editingRoom) {
        await apiClient.put(`/room-types/${editingRoom.id}`, payload);
      } else {
        await apiClient.post('/room-types', payload);
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      setErrorMsg('Failed to save room type. Please ensure required data is present.');
    }
  };

  const triggerDelete = (id: string) => {
    setRoomToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    setErrorMsg('');
    try {
      await apiClient.delete(`/room-types/${roomToDelete}`);
      setShowDeleteModal(false);
      setRoomToDelete(null);
      loadData();
    } catch (e) {
      setErrorMsg('Cannot delete room type. Check if there are active bookings.');
      setShowDeleteModal(false);
      setRoomToDelete(null);
    }
  };

  const openModal = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        description: room.description || '',
        maxOccupancy: room.maxOccupancy,
        totalUnits: room.totalUnits,
        imageUrls: room.imageUrls ? room.imageUrls.join(', ') : '',
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        description: '',
        maxOccupancy: 2,
        totalUnits: 10,
        imageUrls: '',
      });
    }
    setShowModal(true);
  };

  return (
    <>
      <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Room Types Management</h1>
        <Button onClick={() => openModal()}>+ Add Room Type</Button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 font-medium animate-fade-in">
          ⚠️ {errorMsg}
        </div>
      )}
      
      <Card>
        <CardContent className="pt-6">
          {loading ? <p className="text-gray-500">Loading rooms...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => (
                <div key={room.id} className="border rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 bg-white flex flex-col justify-between">
                  <div>
                    {room.imageUrls && room.imageUrls[0] && (
                      <div className="h-40 -mx-6 -mt-6 mb-4 rounded-t-xl overflow-hidden bg-gray-200">
                        <img src={room.imageUrls[0]} alt={room.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h3 className="font-bold text-xl mb-2 text-foreground">{room.name}</h3>
                    <p className="text-gray-500 text-sm mb-6 line-clamp-3 leading-relaxed">{room.description}</p>
                    <div className="flex justify-between items-center text-xs font-medium mb-4">
                      <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-md">Units: {room.totalUnits}</span>
                      <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md">Max Guests: {room.maxOccupancy}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => openModal(room)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => triggerDelete(room.id)}>Delete</Button>
                  </div>
                </div>
              ))}
              {rooms.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No room types found. Please create one.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Modal */}
    {showModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-lg animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingRoom ? 'Edit Room Type' : 'Create Room Type'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Max Occupancy</label>
                  <Input type="number" min="1" value={formData.maxOccupancy} onChange={e => setFormData({...formData, maxOccupancy: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Total Units</label>
                  <Input type="number" min="1" value={formData.totalUnits} onChange={e => setFormData({...formData, totalUnits: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Image URLs (comma separated)</label>
                <Input value={formData.imageUrls} onChange={e => setFormData({...formData, imageUrls: e.target.value})} placeholder="https://..., https://..." />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-md animate-fade-in-up border-none shadow-2xl bg-white rounded-2xl overflow-hidden">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Room Type?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Are you absolutely sure you want to delete this room type? This action cannot be undone, and will fail if the room currently holds ongoing active guest bookings.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t">
                <Button variant="outline" className="w-full sm:w-auto px-6 h-11 rounded-full font-medium" onClick={() => { setShowDeleteModal(false); setRoomToDelete(null); }}>
                  Cancel
                </Button>
                <Button className="w-full sm:w-auto px-6 h-11 rounded-full font-medium bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200" onClick={confirmDelete}>
                  Delete Permanently
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
