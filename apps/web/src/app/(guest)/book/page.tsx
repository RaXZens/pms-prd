'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// ─── helpers ────────────────────────────────────────────────────────────────

function getOrCreateSessionToken(): string {
  const key = 'pms_session_token';
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(key, token);
  }
  return token;
}

function formatCountdown(seconds: number): string {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── HoldExpiredModal ────────────────────────────────────────────────────────

function HoldExpiredModal({ onChooseAgain }: { onChooseAgain: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-primary/20 rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4 text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-serif font-bold text-foreground mb-3">Hold Expired</h3>
        <p className="text-foreground/60 mb-8 leading-relaxed">
          Your hold has expired. This room may no longer be available.
        </p>
        <Button
          onClick={onChooseAgain}
          size="lg"
          className="w-full rounded-full bg-primary hover:bg-primary-light text-primary-foreground shadow-lg h-12 font-semibold"
        >
          Choose a different room
        </Button>
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

function BookPageContent() {
  const { data: session } = useSession();
  const [step, setStep] = useState(2);
  const [mounted, setMounted] = useState(false);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [guestDetails, setGuestDetails] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({ name: '', phone: '', general: '' });
  const [loading, setLoading] = useState(true);

  // Hold state
  const [sessionToken, setSessionToken] = useState<string>('');
  const [holdData, setHoldData] = useState<{ holdId: string; expiresAt: string } | null>(null);
  const [holdError, setHoldError] = useState('');
  const [holdExpired, setHoldExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quantity stepper state: roomId → selected quantity
  const [roomQuantities, setRoomQuantities] = useState<Record<string, number>>({});
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const searchParams = useSearchParams();
  const router = useRouter();

  // On mount: handle success callback, redirect home if no dates, or auto-search
  useEffect(() => {
    setMounted(true);
    setSessionToken(getOrCreateSessionToken());

    if (searchParams.get('success') === 'true') {
      const simulateFor = searchParams.get('simulate_webhook_for') || searchParams.get('bookingId');
      if (simulateFor) {
        // Keep spinner up until simulate completes so the booking is CONFIRMED before the navbar re-fetches
        apiClient.get(`/payment/simulate?bookingId=${simulateFor}`)
          .then(() => { setStep(4); setLoading(false); window.dispatchEvent(new Event('booking-confirmed')); })
          .catch(() => { setStep(4); setLoading(false); });
      } else {
        setStep(4);
        setLoading(false);
      }
      return;
    }

    const paramCheckIn = searchParams.get('checkIn');
    const paramCheckOut = searchParams.get('checkOut');
    const paramGuests = parseInt(searchParams.get('guests') || '1', 10);

    if (!paramCheckIn || !paramCheckOut) {
      router.push('/');
      return;
    }

    setDates({ checkIn: paramCheckIn, checkOut: paramCheckOut });
    const nights = Math.ceil((new Date(paramCheckOut).getTime() - new Date(paramCheckIn).getTime()) / (1000 * 60 * 60 * 24));

    apiClient.get('/room-types').then(async (roomTypes) => {
      const results = await Promise.all(roomTypes.map(async (rt: any) => {
        const res = await apiClient.get(`/availability?roomTypeId=${rt.id}&checkIn=${paramCheckIn}&checkOut=${paramCheckOut}`);
        const avgPrice = res.totalPrice && nights > 0 ? res.totalPrice / nights : 250;
        return { ...rt, available: res.isAvailable, availableUnits: res.availableUnits, scarce: res.scarce, price: avgPrice, calculatedTotalPrice: res.totalPrice };
      }));
      setAvailableRooms(results.filter(r => r.available && r.maxOccupancy >= paramGuests));
      setStep(2);
      setLoading(false);
    }).catch(() => router.push('/'));
  }, [searchParams]);

  // Countdown timer — starts/restarts whenever holdData changes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!holdData) { setSecondsLeft(0); return; }

    const tick = () => {
      const secs = Math.floor((new Date(holdData.expiresAt).getTime() - Date.now()) / 1000);
      if (secs <= 0) {
        clearInterval(timerRef.current!);
        setSecondsLeft(0);
        setHoldExpired(true);
        // Best-effort cleanup; ignore errors since the hold already expired
        apiClient.delete(`/holds/${sessionToken}`).catch(() => {});
      } else {
        setSecondsLeft(secs);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [holdData, sessionToken]);

  const resetSessionToken = () => {
    const key = 'pms_session_token';
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(key, fresh);
    setSessionToken(fresh);
  };

  const releaseHold = async () => {
    if (!sessionToken) return;
    try { await apiClient.delete(`/holds/${sessionToken}`); } catch (_) {}
    setHoldData(null);
    setSecondsLeft(0);
    setHoldExpired(false);
  };

  const handleSelectRoom = async (room: any) => {
    const qty = roomQuantities[room.id] ?? 1;
    setHoldError('');
    setLoading(true);
    try {
      const result = await apiClient.post('/holds', {
        roomTypeId: room.id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        quantity: qty,
        sessionToken,
      });
      setHoldData({ holdId: result.holdId, expiresAt: result.expiresAt });
      setSelectedRoom(room);
      setSelectedQuantity(qty);
      setStep(3);
    } catch (e: any) {
      const msg: string = e?.message || '';
      console.error('[Hold] createHold failed:', msg, e);
      if (msg.toLowerCase().includes('not enough') || msg.toLowerCase().includes('conflict') || msg.includes('409')) {
        // Refresh max to current available — cap existing qty
        setRoomQuantities((prev) => ({
          ...prev,
          [room.id]: Math.min(qty, room.availableUnits > 0 ? room.availableUnits - 1 : 1),
        }));
        setHoldError('This room just became unavailable, please select again.');
      } else {
        setHoldError(msg || 'Could not reserve this room. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleBackToRooms = async () => {
    await releaseHold();
    resetSessionToken();
    setStep(2);
  };

  const handleHoldExpiredChooseAgain = async () => {
    setHoldExpired(false);
    setHoldData(null);
    resetSessionToken();
    setStep(2);
  };

  if (!mounted || loading) {
    const isSuccess = searchParams.get('success') === 'true';
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-sm text-foreground/60 font-medium animate-pulse">
          {isSuccess ? 'Confirming your booking, please wait...' : 'Checking availability...'}
        </p>
      </div>
    );
  }

  const isUrgent = secondsLeft > 0 && secondsLeft < 180;

  const handleBook = async () => {
    setErrors({ ...errors, name: '', phone: '', general: '' });

    let hasError = false;
    const newErrors = { name: '', phone: '', general: '' };

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

    if (hasError) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const booking = await apiClient.post('/bookings', {
        roomTypeId: selectedRoom.id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        guestName: guestDetails.name,
        guestPhone: guestDetails.phone,
        guestId: (session?.user as any)?.id || undefined,
        quantity: selectedQuantity,
        sessionToken,
      });

      // Clear hold state — the server released it during booking creation
      setHoldData(null);
      if (timerRef.current) clearInterval(timerRef.current);

      const checkout = await apiClient.post('/payment/checkout', { bookingId: booking.id });

      if (checkout.url) {
        router.push('/my-bookings?canceled=true');
        setTimeout(() => { window.location.assign(checkout.url); }, 300);
      }
    } catch (e: any) {
      console.error(e);
      setErrors({ ...errors, general: e.message || 'Failed to initiate payment. Please try again later.' });
      setLoading(false);
    }
  };

  const nightCount = dates.checkIn && dates.checkOut
    ? Math.ceil((new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className={`min-h-screen bg-background text-foreground relative overflow-hidden ${isUrgent ? 'pt-10' : ''} py-24`}>
      {/* Expired hold modal */}
      {holdExpired && <HoldExpiredModal onChooseAgain={handleHoldExpiredChooseAgain} />}

      {/* Urgent hold banner — fixed at top when < 3 min remain */}
      {isUrgent && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-amber-500 text-white text-center py-2.5 px-4 text-sm font-semibold shadow-lg">
          ⏱ Room held for{' '}
          <span className="font-mono font-bold">{formatCountdown(secondsLeft)}</span>
          {' '}— complete booking before it expires
        </div>
      )}

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

        {/* Step Indicator — 3 steps mapped to internal steps 2/3/4 */}
        <div className="flex justify-center mb-12 overflow-x-auto px-2">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
            {[
              { display: 1, internal: 2, label: 'Room' },
              { display: 2, internal: 3, label: 'Details' },
              { display: 3, internal: 4, label: 'Confirm' },
            ].map(({ display, internal, label }, i, arr) => {
              const done = step > internal;
              const active = step === internal;
              return (
                <div key={display} className="flex items-center gap-1 sm:gap-2 md:gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`flex items-center justify-center gap-1 w-8 h-8 sm:w-auto sm:h-auto sm:px-3 md:px-4 sm:py-2 rounded-full transition-all duration-300 text-xs font-bold sm:font-semibold tracking-wide uppercase ${done ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-primary/10 text-foreground/40'}`}>
                      {done ? (
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : <span>{display}</span>}
                      <span className="hidden sm:inline">{label}</span>
                    </span>
                    <span className={`sm:hidden text-[10px] font-semibold tracking-wide ${active ? 'text-primary' : done ? 'text-green-500' : 'text-foreground/30'}`}>{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className={`w-4 sm:w-8 md:w-12 h-[2px] mb-4 sm:mb-0 ${done ? 'bg-green-500' : active ? 'bg-primary' : 'bg-primary/20'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Rooms */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            {/* Date summary bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 backdrop-blur-md border border-primary/10 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-4 text-sm font-medium text-foreground/70">
                <span>
                  <span className="text-xs uppercase tracking-wider text-foreground/40 block">Check-in</span>
                  {new Date(dates.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <svg className="w-4 h-4 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                <span>
                  <span className="text-xs uppercase tracking-wider text-foreground/40 block">Check-out</span>
                  {new Date(dates.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="hidden sm:block text-xs bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full">
                  {nightCount} night{nightCount !== 1 ? 's' : ''}
                </span>
              </div>
              <Link href="/" className="text-xs font-semibold text-foreground/50 hover:text-primary transition-colors flex items-center gap-1">
                ← Change dates
              </Link>
            </div>

            {holdError && (
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-2xl px-5 py-4 text-sm font-medium animate-fade-in">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {holdError}
              </div>
            )}

            {availableRooms.length === 0 ? (
              <div className="text-center py-16 bg-card/60 backdrop-blur-md rounded-3xl border border-primary/10 shadow-xl">
                <p className="text-foreground/60 text-lg">No rooms available for the selected dates.</p>
              </div>
            ) : (
              availableRooms.map((room) => (
                <Card key={room.id} className="overflow-hidden flex flex-col shadow-xl hover:shadow-2xl transition-all duration-500 border border-primary/10 bg-card/60 backdrop-blur-md rounded-3xl hover:border-accent/30">
                  {/* Full-width room image */}
                  <div className="w-full h-52 sm:h-64 relative overflow-hidden rounded-t-3xl">
                    {room.imageUrls?.[0] ? (
                      <img src={room.imageUrls[0]} alt={room.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-foreground/40 bg-primary/5">No Image</div>
                    )}
                    {/* Scarcity badge overlaid on image bottom-left */}
                    {room.scarce && (
                      <div className="absolute bottom-3 left-3">
                        <span className="text-xs font-bold tracking-wide uppercase bg-amber-500 text-white px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                          Only {room.availableUnits} room{room.availableUnits !== 1 ? 's' : ''} left!
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-foreground leading-tight">{room.name}</h3>
                        <span className="text-xs font-semibold tracking-wider uppercase bg-primary/10 text-foreground/70 px-3 py-1.5 rounded-full whitespace-nowrap shrink-0">
                          Up to {room.maxOccupancy} guests
                        </span>
                      </div>
                      <p className="text-foreground/70 leading-relaxed text-sm font-sans">{room.description}</p>
                    </div>
                    <div className="mt-6 border-t border-primary/10 pt-5 space-y-4">
                      {/* Price per night + stepper row */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Per night</p>
                          <div className="text-2xl sm:text-3xl font-bold text-accent">
                            ฿{Number(room.price || 0).toFixed(2)}
                            <span className="text-xs text-foreground/60 font-normal ml-1">/ night</span>
                          </div>
                        </div>

                        {/* +/- Quantity Stepper */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-xs text-foreground/50 uppercase tracking-wider font-semibold">Rooms</span>
                          <div className="flex items-center gap-2 border border-primary/20 rounded-full px-2 py-1 bg-background/50">
                            <button
                              type="button"
                              onClick={() => setRoomQuantities((prev) => ({ ...prev, [room.id]: Math.max(1, (prev[room.id] ?? 1) - 1) }))}
                              disabled={(roomQuantities[room.id] ?? 1) <= 1}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold text-primary disabled:text-foreground/20 hover:bg-primary/10 transition-colors disabled:cursor-not-allowed"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-bold text-foreground text-sm">
                              {roomQuantities[room.id] ?? 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRoomQuantities((prev) => ({ ...prev, [room.id]: Math.min(room.availableUnits, (prev[room.id] ?? 1) + 1) }))}
                              disabled={(roomQuantities[room.id] ?? 1) >= room.availableUnits}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold text-primary disabled:text-foreground/20 hover:bg-primary/10 transition-colors disabled:cursor-not-allowed"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Total + Select button */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-foreground/50 uppercase tracking-wider mb-0.5">Total for stay</p>
                          <p className="font-bold text-lg text-foreground">
                            ฿{((room.calculatedTotalPrice || 0) * (roomQuantities[room.id] ?? 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-foreground/40">
                            {nightCount} night{nightCount !== 1 ? 's' : ''}{(roomQuantities[room.id] ?? 1) > 1 ? ` × ${roomQuantities[room.id]} rooms` : ''}
                          </p>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => handleSelectRoom(room)}
                          disabled={loading}
                          className="rounded-full px-6 sm:px-8 bg-primary hover:bg-primary-light text-primary-foreground shadow-md hover:shadow-primary/30 transition-all duration-300 h-11"
                        >
                          {loading ? 'Reserving...' : 'Select Room'}
                        </Button>
                      </div>
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
                  <Button
                    variant="ghost"
                    onClick={handleBackToRooms}
                    className="mb-4 -ml-2 hover:bg-primary/10 text-foreground/80 rounded-full"
                  >
                    ← Back to Rooms
                  </Button>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 tracking-wide uppercase text-foreground/70">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={guestDetails.name}
                        onChange={(e) => setGuestDetails({ ...guestDetails, name: e.target.value })}
                        placeholder="John Doe"
                        required
                        className="bg-background/50 border-primary/20 focus:border-primary rounded-xl h-12"
                      />
                      {errors.name && <p className="text-red-500 text-xs font-medium mt-1 animate-fade-in">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 tracking-wide uppercase text-foreground/70">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={guestDetails.phone}
                        required
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^0-9+\s()-]/g, '');
                          const justDigits = sanitized.replace(/\D/g, '');
                          if (justDigits.length <= 10) {
                            setGuestDetails({ ...guestDetails, phone: sanitized });
                          }
                        }}
                        placeholder="08XXXXXXXX"
                        className="bg-background/50 border-primary/20 focus:border-primary rounded-xl h-12"
                      />
                      {errors.phone && <p className="text-red-500 text-xs font-medium mt-1 animate-fade-in">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="mt-8 p-6 border border-primary/20 rounded-2xl bg-primary/5 flex items-start gap-4">
                    <svg className="w-8 h-8 text-accent mt-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-lg mb-1 text-foreground">Secure Payment via Stripe</h4>
                      <p className="text-sm text-foreground/60 leading-relaxed">
                        You will be securely redirected to Stripe's checkout page to complete your reservation. We do not store your credit card details.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-primary/10 bg-primary/5 px-8 py-4">
                  {errors.general && (
                    <p className="text-red-500 text-sm font-medium mb-4 animate-fade-in mr-auto flex items-center gap-2">
                      <span>⚠️</span> {errors.general}
                    </p>
                  )}
                  <Button
                    onClick={handleBook}
                    disabled={!guestDetails.name || !guestDetails.phone || loading}
                    size="lg"
                    className="w-full md:w-auto mt-3 px-10 rounded-full bg-primary hover:bg-primary-light text-primary-foreground shadow-lg hover:shadow-primary/30 transition-all duration-300 h-12 text-base font-semibold"
                  >
                    {loading ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Summary panel */}
            <div className="md:col-span-1">
              <Card className="border border-primary/10 bg-card/60 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl sticky top-8">
                <CardHeader className="border-b border-primary/10 pb-4">
                  <CardTitle className="text-xl font-serif font-bold text-foreground">Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Room Selected</p>
                    <p className="font-bold text-lg text-foreground">
                      {selectedQuantity > 1 ? `${selectedQuantity} × ${selectedRoom?.name}` : selectedRoom?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Dates</p>
                    <p className="font-medium text-foreground">
                      {dates.checkIn} <span className="text-foreground/40">to</span> {dates.checkOut}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wider">Stay Duration</p>
                    <p className="font-medium text-foreground">{nightCount} Night{nightCount !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-foreground/60">
                      <span>฿{Number(selectedRoom?.price || 0).toFixed(2)} / night</span>
                      <span>× {nightCount} night{nightCount !== 1 ? 's' : ''}</span>
                    </div>
                    {selectedQuantity > 1 && (
                      <div className="flex justify-between text-foreground/60">
                        <span>{selectedQuantity} rooms</span>
                        <span>× {selectedQuantity}</span>
                      </div>
                    )}
                  </div>

                  <div className="border border-accent/30 bg-accent/10 p-4 rounded-2xl">
                    <p className="font-bold flex items-center gap-1 text-accent text-xs tracking-wider uppercase">
                      ⚠️ Cancellation Policy
                    </p>
                    <p className="mt-1 text-xs text-foreground/80 leading-relaxed font-medium">
                      All bookings are non-refundable. All sales final.
                    </p>
                  </div>

                  <div className="border-t border-primary/10 pt-5">
                    <div className="flex justify-between items-end font-bold text-2xl">
                      <span className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Total</span>
                      <span className="text-accent">
                        ฿{(Number(selectedRoom?.calculatedTotalPrice || 0) * selectedQuantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/40 mt-1 text-right">
                      Avg: ฿{Number(selectedRoom?.price || 0).toFixed(2)}/night{selectedQuantity > 1 ? ` × ${selectedQuantity} rooms` : ''}
                    </p>
                  </div>

                  {/* Hold countdown — shown in summary when ≥ 3 minutes left */}
                  {holdData && secondsLeft > 0 && !isUrgent && (
                    <div className="border border-primary/20 bg-primary/5 rounded-2xl p-4 flex items-center gap-3">
                      <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs text-foreground/50 uppercase tracking-wider mb-0.5">Room held for</p>
                        <p className="font-mono font-bold text-lg text-primary">{formatCountdown(secondsLeft)}</p>
                      </div>
                    </div>
                  )}

                  {/* Urgent timer in summary too — mirrors the banner */}
                  {isUrgent && (
                    <div className="border border-amber-500/40 bg-amber-500/10 rounded-2xl p-4 flex items-center gap-3">
                      <svg className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-semibold mb-0.5">Hurry! Hold expires in</p>
                        <p className="font-mono font-bold text-lg text-amber-600 dark:text-amber-400">{formatCountdown(secondsLeft)}</p>
                      </div>
                    </div>
                  )}
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-4xl font-serif font-bold mb-4 text-foreground">Booking Confirmed!</h2>
              <p className="text-foreground/70 mb-6 text-lg leading-relaxed font-sans">
                Thank you! Your stay at <span className="font-bold text-accent">Royal Amethyst</span> has been successfully booked. A confirmation email was routed to your inbox.
              </p>
              {/* Status badges */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  CONFIRMED
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  PAID
                </span>
              </div>

              {selectedRoom && (
                <div className="mb-8 p-4 rounded-2xl border border-primary/20 bg-primary/5 text-sm text-foreground/80 font-medium">
                  {selectedQuantity > 1 ? `${selectedQuantity} × ${selectedRoom.name}` : selectedRoom.name}
                  {' — '}
                  {dates.checkIn} to {dates.checkOut}
                  {' — '}
                  <span className="text-accent font-bold">
                    ฿{(Number(selectedRoom.calculatedTotalPrice || 0) * selectedQuantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB
                  </span>
                </div>
              )}
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <BookPageContent />
    </Suspense>
  );
}
