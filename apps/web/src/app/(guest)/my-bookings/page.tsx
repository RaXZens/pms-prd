'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function MyBookingsPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (session?.user) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [session]);

  const loadBookings = async () => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    try {
      const data = await apiClient.get(`/bookings?guestId=${userId}`);
      setBookings(data);
    } catch (e) {
      console.error('Failed to load bookings:', e);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UNPAID': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getNights = (checkIn: string, checkOut: string) => {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-24">
      <div className="container mx-auto px-4 max-w-4xl mb-6">
        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
          ← Back to Home
        </Link>
      </div>
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Reservations</h1>
            <p className="text-gray-500 mt-1">View and manage your bookings</p>
          </div>
          <Link href="/book">
            <Button>Book Another Stay</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="text-center py-20 border-none shadow-xl">
            <CardContent>
              <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">No Reservations Yet</h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">You haven't made any bookings. Start planning your stay at Royal Amethyst!</p>
              <Link href="/book">
                <Button size="lg" className="px-8 rounded-full">Make a Reservation</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (() => {
          const indexOfLastItem = currentPage * itemsPerPage;
          const indexOfFirstItem = indexOfLastItem - itemsPerPage;
          const currentBookings = bookings.slice(indexOfFirstItem, indexOfLastItem);
          const totalPages = Math.ceil(bookings.length / itemsPerPage);

          return (
            <div className="space-y-6">
              {currentBookings.map((booking) => (
              <Card key={booking.id} className="border-none shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Room Image */}
                  <div className="md:w-1/4 h-48 md:h-auto bg-gray-200 relative">
                    {booking.roomType?.imageUrls?.[0] ? (
                      <img src={booking.roomType.imageUrls[0]} alt={booking.roomType?.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Booking Info */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{booking.roomType?.name || 'Room'}</h3>
                        <p className="text-sm text-gray-500 mt-1">Booking #{booking.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getPaymentColor(booking.paymentStatus)}`}>
                          {booking.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
                        <p className="font-semibold text-sm mt-1">{formatDate(booking.checkIn)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
                        <p className="font-semibold text-sm mt-1">{formatDate(booking.checkOut)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                        <p className="font-semibold text-sm mt-1">{getNights(booking.checkIn, booking.checkOut)} Night{getNights(booking.checkIn, booking.checkOut) > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                        <p className="font-bold text-lg text-primary">฿{Number(booking.totalPrice).toLocaleString()}</p>
                      </div>
                    </div>

                    {booking.status === 'PENDING' && (
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <p className="text-sm text-amber-600">⏳ Awaiting payment confirmation</p>
                      </div>
                    )}

                    {booking.status === 'CONFIRMED' && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-emerald-600">✅ Your reservation is confirmed. Enjoy your stay!</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-white rounded-xl shadow-md mt-6">
                  <p className="text-sm text-gray-500 font-medium">
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
          );
        })()}
      </div>
    </div>
  );
}
