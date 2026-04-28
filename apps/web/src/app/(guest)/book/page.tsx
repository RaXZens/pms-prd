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

  if (!mounted || (searchParams.get('success') === 'true' && step !== 4)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-sm text-foreground/60 font-medium animate-pulse">Confirming your booking, please wait...</p>
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
      const booking = await apiClient.post('/bookings', {
        roomTypeId: selectedRoom.id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        guestName: guestDetails.name,
        guestPhone: guestDetails.phone,
        guestId: (session?.user as any)?.id || undefined,
      });

      const checkout = await apiClient.post('/payment/checkout', {
        bookingId: booking.id,
      });

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
    <div className="min-h-screen bg-background text-foreground py-24 relative overflow-hidden">
      {/* Luxury Background Mesh */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/5 blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-4xl mb-6 relative z-10">
        <Link href="/" className="text-sm font-medium text-foreground/60 hover:text-primary transition-colors flex items-center gap-2">
          ← Back to Home
        </Link>
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">Reserve Your Stay</h1>
          <p className="text-foreground/60">Experience the Royal Amethyst difference.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4 text-sm font-semibold tracking-wider uppercase">
            <span className={`px-4 py-2 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-primary/10 text-foreground/40'}`}>1. Dates</span>
            <span className={`w-12 h-[2px] ${step >= 2 ? 'bg-primary' : 'bg-primary/20'}`} />
            <span className={`px-4 py-2 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-primary/10 text-foreground/40'}`}>2. Room</span>
            <span className={`w-12 h-[2px] ${step >= 3 ? 'bg-primary' : 'bg-primary/20'}`} />
            <span className={`px-4 py-2 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-primary/10 text-foreground/40'}`}>3. Checkout</span>
          </div>
        </div>

        {/* Step 1: Dates */}
        {step === 1 && (
          <Card className="animate-fade-in shadow-2xl border border-primary/10 bg-card/60 backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-serif font-bold text-foreground">Select Your Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 tracking-wide uppercase text-foreground/70">Check-in</label>
                  <Input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={dates.checkIn} 
                    onChange={e => setDates({...dates, checkIn: e.target.value})} 
                    className="bg-background/50 border-primary/20 focus:border-primary rounded-xl h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 tracking-wide uppercase text-foreground/70">Check-out</label>
                  <Input 
                    type="date" 
                    value={dates.checkOut} 
                    disabled={!dates.checkIn}
                    min={dates.checkIn ? new Date(new Date(dates.checkIn).getTime() + 86400000).toISOString().split('T')[0] : ''}
                    onChange={e => setDates({...dates, checkOut: e.target.value})} 
                    className="bg-background/50 border-primary/20 focus:border-primary rounded-xl h-12"
                  />
                </div>
              </div>

              {errors.dates && (
                <p className="text-red-500 text-sm font-medium mt-2 animate-fade-in flex items-center gap-2">
                  <span>⚠️</span> {errors.dates}
                </p>
              )}

              {errors.general && (
                <p className="text-red-500 text-sm font-medium mt-2 animate-fade-in flex items-center gap-2">
                  <span>⚠️</span> {errors.general}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t border-primary/10 bg-primary/5 px-8 py-4">
              <Button onClick={handleSearch} disabled={!dates.checkIn || !dates.checkOut || loading} className="rounded-full mt-3 px-8 bg-primary hover:bg-primary-light text-primary-foreground shadow-lg hover:shadow-primary/30 transition-all duration-300 h-12 text-base font-semibold">
                {loading ? 'Searching...' : 'Check Availability'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Rooms */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <Button variant="ghost" onClick={() => setStep(1)} className="mb-4 hover:bg-primary/10 text-foreground/80 rounded-full">← Back to Dates</Button>
            {availableRooms.length === 0 ? (
              <div className="text-center py-16 bg-card/60 backdrop-blur-md rounded-3xl border border-primary/10 shadow-xl">
                <p className="text-foreground/60 text-lg">No rooms available for the selected dates.</p>
              </div>
            ) : (
              availableRooms.map(room => (
                <Card key={room.id} className="overflow-hidden flex flex-col md:flex-row shadow-xl hover:shadow-2xl transition-all duration-500 border border-primary/10 bg-card/60 backdrop-blur-md rounded-3xl hover:border-accent/30">
                  <div className="md:w-2/5 h-64 md:h-auto relative overflow-hidden">
                    {room.imageUrls?.[0] ? (
                      <img src={room.imageUrls[0]} alt={room.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-foreground/40 bg-primary/5">No Image</div>
                    )}
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-3xl font-serif font-bold mb-3 text-foreground">{room.name}</h3>
                      <p className="text-foreground/70 mb-6 leading-relaxed text-sm font-sans">{room.description}</p>
                      <div className="flex items-center gap-4 text-xs font-semibold tracking-wider uppercase bg-primary/10 text-foreground/80 px-4 py-2 rounded-full inline-flex">
                        <span>Max Occupancy: {room.maxOccupancy} Guests</span>
                      </div>
                    </div>
                    <div className="mt-8 flex items-end justify-between border-t border-primary/10 pt-6">
                      <div>
                        <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Starting from</p>
                        <div className="text-3xl font-bold text-accent">฿{Number(room.price || 0).toFixed(2)} <span className="text-xs text-foreground/60 font-normal">/ night</span></div>
                      </div>
                      <Button size="lg" onClick={() => { setSelectedRoom(room); setStep(3); }} className="rounded-full px-8 bg-primary hover:bg-primary-light text-primary-foreground shadow-md hover:shadow-primary/30 transition-all duration-300">
                        Select Room
                      </Button>
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
              <Card className="border border-primary/10 bg-card/60 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="border-b border-primary/10 pb-6">
                  <CardTitle className="text-2xl font-serif font-bold text-foreground">Guest Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <Button variant="ghost" onClick={() => setStep(2)} className="mb-4 -ml-2 hover:bg-primary/10 text-foreground/80 rounded-full">← Back to Rooms</Button>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 tracking-wide uppercase text-foreground/70">Full Name <span className="text-red-500">*</span></label>
                      <Input 
                        value={guestDetails.name} 
                        onChange={e => setGuestDetails({...guestDetails, name: e.target.value})} 
                        placeholder="John Doe" 
                        required 
                        className="bg-background/50 border-primary/20 focus:border-primary rounded-xl h-12"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs font-medium mt-1 animate-fade-in">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 tracking-wide uppercase text-foreground/70">Phone Number <span className="text-red-500">*</span></label>
                      <Input 
                        value={guestDetails.phone} 
                        required
                        onChange={e => {
                          const sanitized = e.target.value.replace(/[^0-9+\s()-]/g, '');
                          const justDigits = sanitized.replace(/\D/g, '');
                          if (justDigits.length <= 10) {
                            setGuestDetails({...guestDetails, phone: sanitized});
                          }
                        }} 
                        placeholder="08XXXXXXXX" 
                        className="bg-background/50 border-primary/20 focus:border-primary rounded-xl h-12"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs font-medium mt-1 animate-fade-in">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-8 p-6 border border-primary/20 rounded-2xl bg-primary/5 flex items-start gap-4">
                    <svg className="w-8 h-8 text-accent mt-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-lg mb-1 text-foreground">Secure Payment via Stripe</h4>
                      <p className="text-sm text-foreground/60 leading-relaxed">You will be securely redirected to Stripe's checkout page to complete your reservation. We do not store your credit card details.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-primary/10 bg-primary/5 px-8 py-4">
                  {errors.general && (
                    <p className="text-red-500 text-sm font-medium mb-4 animate-fade-in mr-auto flex items-center gap-2">
                      <span>⚠️</span> {errors.general}
                    </p>
                  )}
                  
                  <Button onClick={handleBook} disabled={!guestDetails.name || !guestDetails.phone || loading} size="lg" className="w-full md:w-auto mt-3 px-10 rounded-full bg-primary hover:bg-primary-light text-primary-foreground shadow-lg hover:shadow-primary/30 transition-all duration-300 h-12 text-base font-semibold">
                    {loading ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="md:col-span-1">
              <Card className="border border-primary/10 bg-card/60 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl sticky top-8">
                <CardHeader className="border-b border-primary/10 pb-4">
                  <CardTitle className="text-xl font-serif font-bold text-foreground">Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Room Selected</p>
                    <p className="font-bold text-lg text-foreground">{selectedRoom?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Dates</p>
                    <p className="font-medium text-foreground">{dates.checkIn} <span className="text-foreground/40">to</span> {dates.checkOut}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Stay Duration</p>
                    <p className="font-medium text-foreground">{Math.ceil((new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) / (1000 * 60 * 60 * 24))} Nights</p>
                  </div>

                  <div className="border border-accent/30 bg-accent/10 p-4 rounded-2xl">
                    <p className="font-bold flex items-center gap-1 text-accent text-xs tracking-wider uppercase">
                      ⚠️ Cancellation Policy
                    </p>
                    <p className="mt-1 text-xs text-foreground/80 leading-relaxed font-medium">All bookings are non-refundable. All sales final.</p>
                  </div>

                  <div className="border-t border-primary/10 pt-6">
                    <div className="flex justify-between items-end font-bold text-2xl">
                      <span className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Total</span>
                      <span className="text-accent">
                        ฿{Number(selectedRoom?.calculatedTotalPrice || 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/40 mt-1 text-right">Avg: ฿{Number(selectedRoom?.price || 0).toFixed(2)}/night</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <Card className="text-center py-20 animate-fade-in shadow-2xl border border-primary/10 bg-card/60 backdrop-blur-md relative overflow-hidden rounded-3xl">
            <div className="absolute top-0 right-0 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <CardContent className="relative z-10 max-w-lg mx-auto">
              <div className="w-24 h-24 bg-accent text-background rounded-full flex items-center justify-center mx-auto mb-10 shadow-xl shadow-accent/20 animate-fade-in-up">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-4xl font-serif font-bold mb-4 text-foreground">Booking Confirmed!</h2>
              <p className="text-foreground/70 mb-10 text-lg leading-relaxed font-sans">
                Thank you! Your stay at <span className="font-bold text-accent">Royal Amethyst</span> has been successfully booked. A confirmation email was routed to your inbox.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/my-bookings" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-10 h-12 rounded-full font-semibold border-primary/30 hover:bg-primary/10 transition-all">
                    View My Bookings
                  </Button>
                </Link>
                <Link href="/" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto px-10 h-12 rounded-full font-semibold bg-primary hover:bg-primary-light text-primary-foreground shadow-lg hover:shadow-primary/30 transition-all">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <BookPageContent />
    </Suspense>
  );
}
