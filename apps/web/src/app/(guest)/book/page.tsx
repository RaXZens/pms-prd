'use client';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';

function BookPageContent() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [guestDetails, setGuestDetails] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({ dates: '', name: '', phone: '', general: '' });
  const [loading, setLoading] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (searchParams.get('success') === 'true') {
      const simulateFor = searchParams.get('simulate_webhook_for') || searchParams.get('bookingId');
      if (simulateFor) {
        apiClient.get(`/payment/simulate?bookingId=${simulateFor}`).then(() => {
          setStep(4);
        });
      } else {
        setStep(4);
      }
    }
    if (searchParams.get('canceled') === 'true') {
      setStep(3); // Go back to checkout step
    }
  }, [searchParams]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleSearch = async () => {
    setErrors({ ...errors, dates: '', general: '' });
    if (!dates.checkIn || !dates.checkOut) return;
    
    if (new Date(dates.checkIn) >= new Date(dates.checkOut)) {
      setErrors({ ...errors, dates: 'Check-out date must be after check-in date.' });
      return;
    }

    setLoading(true);
    try {
      const roomTypes = await apiClient.get('/room-types');
      const nightCount = Math.ceil((new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      
      const availabilityPromises = roomTypes.map(async (rt: any) => {
        const res = await apiClient.get(`/availability?roomTypeId=${rt.id}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
        // Calculate average price per night if totalPrice is present, otherwise fallback
        const avgPrice = res.totalPrice && nightCount > 0 ? (res.totalPrice / nightCount) : 250;
        return { ...rt, available: res.isAvailable, price: avgPrice, calculatedTotalPrice: res.totalPrice };
      });
      
      const results = await Promise.all(availabilityPromises);
      setAvailableRooms(results.filter(r => r.available));
      setStep(2);
    } catch (e) {
      console.error(e);
      setErrors({ ...errors, general: 'Error fetching availability. Please try again.' });
    }
    setLoading(false);
  };

  const handleBook = async () => {
    setErrors({ ...errors, name: '', phone: '', general: '' });
    
    let hasError = false;
    const newErrors = { dates: '', name: '', phone: '', general: '' };

    if (!guestDetails.name.trim()) {
      newErrors.name = 'Full Name is required.';
      hasError = true;
    }

    const digitCount = guestDetails.phone.replace(/\D/g, '').length;
    if (digitCount === 0) {
      newErrors.phone = 'Phone Number is required.';
      hasError = true;
    } else if (digitCount < 9 || digitCount > 10) {
      newErrors.phone = 'Please enter a valid phone number (between 9 and 10 digits).';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Pending Booking
      const booking = await apiClient.post('/bookings', {
        roomTypeId: selectedRoom.id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        guestName: guestDetails.name,
        guestPhone: guestDetails.phone,
        guestId: (session?.user as any)?.id || undefined,
      });

      // 2. Create Stripe Checkout Session
      const checkout = await apiClient.post('/payment/checkout', {
        bookingId: booking.id,
      });

      // 3. Redirect to Stripe (or fallback URL)
      if (checkout.url) {
        window.location.href = checkout.url;
      }
    } catch (e: any) {
      console.error(e);
      setErrors({ ...errors, general: e.message || 'Failed to initiate payment. Please try again later.' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-24">
      <div className="container mx-auto px-4 max-w-4xl mb-6">
        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
          ← Back to Home
        </Link>
      </div>
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-foreground mb-4">Reserve Your Stay</h1>
          <p className="text-gray-500">Experience the Royal Amethyst difference.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'}`}>1. Dates</span>
            <span className="w-8 h-[2px] bg-gray-200" />
            <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'}`}>2. Room</span>
            <span className="w-8 h-[2px] bg-gray-200" />
            <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'}`}>3. Checkout</span>
          </div>
        </div>

        {/* Step 1: Dates */}
        {step === 1 && (
          <Card className="animate-fade-in shadow-xl border-none">
            <CardHeader>
              <CardTitle>Select Your Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Check-in</label>
                  <Input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={dates.checkIn} 
                    onChange={e => setDates({...dates, checkIn: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Check-out</label>
                  <Input 
                    type="date" 
                    value={dates.checkOut} 
                    disabled={!dates.checkIn}
                    min={dates.checkIn ? new Date(new Date(dates.checkIn).getTime() + 86400000).toISOString().split('T')[0] : ''}
                    onChange={e => setDates({...dates, checkOut: e.target.value})} 
                  />
                </div>
              </div>

              {errors.dates && (
                <p className="text-red-500 text-sm font-medium mt-2 animate-fade-in">
                  ⚠️ {errors.dates}
                </p>
              )}

              {errors.general && (
                <p className="text-red-500 text-sm font-medium mt-2 animate-fade-in">
                  ⚠️ {errors.general}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6 mt-4">
              <Button onClick={handleSearch} disabled={!dates.checkIn || !dates.checkOut || loading}>
                {loading ? 'Searching...' : 'Check Availability'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Rooms */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <Button variant="ghost" onClick={() => setStep(1)} className="mb-4">← Back to Dates</Button>
            {availableRooms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <p className="text-gray-500">No rooms available for selected dates.</p>
              </div>
            ) : (
              availableRooms.map(room => (
                <Card key={room.id} className="overflow-hidden flex flex-col md:flex-row shadow-lg hover:shadow-xl transition-shadow border-none">
                  <div className="md:w-2/5 bg-gray-200 h-64 md:h-auto relative">
                    {room.imageUrls?.[0] ? (
                      <img src={room.imageUrls[0]} alt={room.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{room.name}</h3>
                      <p className="text-gray-500 mb-6 leading-relaxed">{room.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 font-medium bg-gray-50 px-4 py-2 rounded-lg inline-flex">
                        <span>Max Occupancy: {room.maxOccupancy} Guests</span>
                      </div>
                    </div>
                    <div className="mt-8 flex items-end justify-between border-t pt-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Starting from</p>
                        <div className="text-3xl font-bold text-primary">฿{Number(room.price || 0).toFixed(2)} <span className="text-sm text-gray-500 font-normal">/ night</span></div>
                      </div>
                      <Button size="lg" onClick={() => { setSelectedRoom(room); setStep(3); }}>Select Room</Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 3: Checkout */}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
            <div className="md:col-span-2">
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>Guest Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="ghost" onClick={() => setStep(2)} className="mb-4 -ml-4">← Back to Rooms</Button>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name <span className="text-red-500">*</span></label>
                      <Input 
                        value={guestDetails.name} 
                        onChange={e => setGuestDetails({...guestDetails, name: e.target.value})} 
                        placeholder="John Doe" 
                        required 
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs font-medium mt-1 animate-fade-in">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number <span className="text-red-500">*</span></label>
                      <Input 
                        value={guestDetails.phone} 
                        required
                        onChange={e => {
                          // Allow only digits, +, -, spaces, and parentheses
                          const sanitized = e.target.value.replace(/[^0-9+\s()-]/g, '');
                          // Enforce maximum 10 digits
                          const justDigits = sanitized.replace(/\D/g, '');
                          if (justDigits.length <= 10) {
                            setGuestDetails({...guestDetails, phone: sanitized});
                          }
                        }} 
                        placeholder="08XXXXXXXX" 
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs font-medium mt-1 animate-fade-in">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-8 p-6 border border-primary/20 rounded-xl bg-primary/5 flex items-start gap-4">
                    <svg className="w-8 h-8 text-primary mt-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    <div>
                      <h4 className="font-semibold text-lg mb-1 text-primary">Secure Payment via Stripe</h4>
                      <p className="text-sm text-gray-600">You will be securely redirected to Stripe's checkout page to complete your reservation. We do not store your credit card details.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-6 mt-4">
                  {errors.general && (
                    <p className="text-red-500 text-sm font-medium mb-4 animate-fade-in">
                      ⚠️ {errors.general}
                    </p>
                  )}
                  
                  <Button onClick={handleBook} disabled={!guestDetails.name || !guestDetails.phone || loading} size="lg" className="w-full md:w-auto px-8 shadow-md hover:shadow-lg transition-all">
                    {loading ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            <div className="md:col-span-1">
              <Card className="border-none shadow-xl sticky top-8">
                <CardHeader>
                  <CardTitle className="text-xl">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Room Selected</p>
                      <p className="font-bold text-lg text-foreground">{selectedRoom?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Dates</p>
                      <p className="font-medium text-foreground">{dates.checkIn} <br/>to {dates.checkOut}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Stay Duration</p>
                      <p className="font-medium text-foreground">{Math.ceil((new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) / (1000 * 60 * 60 * 24))} Nights</p>
                    </div>

                    <div className="border-t pt-4 mt-4 text-xs text-amber-700 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                      <p className="font-bold flex items-center gap-1">
                        ⚠️ Cancellation Policy:
                      </p>
                      <p className="mt-1 font-medium">All bookings are non-refundable. All sales final.</p>
                    </div>

                    <div className="border-t pt-6 mt-6">
                      <div className="flex justify-between font-bold text-2xl">
                        <span>Total</span>
                        <span className="text-primary font-bold">
                          ฿{Number(selectedRoom?.calculatedTotalPrice || 0).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-right">Avg: ฿{Number(selectedRoom?.price || 0).toFixed(2)}/night</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <Card className="text-center py-20 animate-fade-in shadow-2xl border-none bg-white relative overflow-hidden rounded-3xl">
            {/* Premium Gradient Background Accent */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <CardContent className="relative z-10 max-w-lg mx-auto">
              <div className="w-28 h-28 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-lg shadow-emerald-200 animate-fade-in-up">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-emerald-800">Booking Confirmed!</h2>
              <p className="text-gray-600 mb-10 text-lg leading-relaxed">
                Thank you! Your stay at <span className="font-bold text-primary">Royal Amethyst</span> has been successfully booked. A confirmation email was routed to your inbox.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/my-bookings" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-10 h-12 rounded-full font-semibold border-2 hover:bg-gray-50 shadow-sm transition-all">
                    View My Bookings
                  </Button>
                </Link>
                <Link href="/" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto px-10 h-12 rounded-full font-semibold shadow-md shadow-primary/30 hover:shadow-lg transition-all">
                    Return Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <BookPageContent />
    </Suspense>
  );
}
