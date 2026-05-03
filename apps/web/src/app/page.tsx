'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import Navbar from '@/components/Navbar';

const AMENITIES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M3 14h18M10 3v18M14 3v18" />
      </svg>
    ),
    title: 'Infinity Pool',
    desc: 'Overlooking the tropical gardens, open sunrise to sunset.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Luxury Spa',
    desc: 'Rejuvenate with signature treatments crafted for royalty.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: 'Fine Dining',
    desc: 'Award-winning cuisine from our world-class culinary team.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: '24/7 Concierge',
    desc: 'Dedicated personal service around the clock, every day.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
    title: 'High-Speed Wi-Fi',
    desc: 'Seamless connectivity across all indoor and outdoor areas.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Airport Transfer',
    desc: 'Complimentary private transfers in our luxury fleet.',
  },
];

export default function Home() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    apiClient.get('/room-types')
      .then(data => { setRooms(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckAvailability = () => {
    setDateError('');
    if (!checkIn || !checkOut) { setDateError('Please select both dates.'); return; }
    if (new Date(checkIn) >= new Date(checkOut)) { setDateError('Check-out must be after check-in.'); return; }
    router.push(`/book?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
  };

  const nightCount = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <main className="min-h-screen relative overflow-x-hidden bg-background text-foreground">
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-32 pb-16 overflow-hidden">
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: 'brightness(0.38)' }}
        />
        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80 pointer-events-none" />
        {/* Soft color accent blobs on top of photo */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[160px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/8 blur-[160px] pointer-events-none animate-pulse" style={{ animationDuration: '15s' }} />

        <div className="relative z-10 text-center max-w-5xl mx-auto animate-fade-in-up">
          <span className="px-4 py-1.5 rounded-full border border-white/30 bg-white/10 text-white text-xs font-bold tracking-widest uppercase mb-6 inline-block backdrop-blur-sm">
            Experience Unrivaled Luxury
          </span>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif font-bold tracking-tight mb-6 text-white leading-[1.05] drop-shadow-2xl">
            Where Luxury<br />
            <span className="text-gradient">Feels Like Home</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/75 mb-14 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-lg">
            Nestled in the heart of paradise. Impeccable service, breathtaking design, and moments that last a lifetime.
          </p>

          {/* ── Booking Widget ─────────────────────────────────────── */}
          <div id="booking-widget" className="bg-card/85 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 max-w-4xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-5 text-left">Check Availability</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Check-in */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">
                  <svg className="w-3.5 h-3.5 inline mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={e => {
                    setCheckIn(e.target.value);
                    setDateError('');
                    if (checkOut && e.target.value >= checkOut) {
                      const next = new Date(new Date(e.target.value).getTime() + 86400000).toISOString().split('T')[0];
                      setCheckOut(next);
                    }
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-primary/20 bg-background/60 text-foreground text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Check-out */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">
                  <svg className="w-3.5 h-3.5 inline mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0] : tomorrow}
                  onChange={e => { setCheckOut(e.target.value); setDateError(''); }}
                  className="w-full h-12 px-4 rounded-xl border border-primary/20 bg-background/60 text-foreground text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Guests */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">
                  <svg className="w-3.5 h-3.5 inline mr-1 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Guests
                </label>
                <div className="flex items-center h-12 rounded-xl border border-primary/20 bg-background/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGuests(g => Math.max(1, g - 1))}
                    className="w-10 h-full flex items-center justify-center text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors text-lg font-bold shrink-0"
                  >−</button>
                  <div className="flex-1 text-center text-sm font-semibold text-foreground">
                    {guests} <span className="text-foreground/45 font-normal text-xs">{guests === 1 ? 'guest' : 'guests'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuests(g => Math.min(10, g + 1))}
                    className="w-10 h-full flex items-center justify-center text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors text-lg font-bold shrink-0"
                  >+</button>
                </div>
              </div>

              {/* CTA */}
              <div>
                {nightCount > 0 && (
                  <p className="text-xs text-foreground/40 font-medium mb-2 text-center">
                    {nightCount} night{nightCount !== 1 ? 's' : ''}
                  </p>
                )}
                <Button
                  onClick={handleCheckAvailability}
                  size="lg"
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary-light text-primary-foreground shadow-lg hover:shadow-primary/30 transition-all font-semibold text-base"
                >
                  Check Availability
                </Button>
              </div>
            </div>
            {dateError && <p className="text-red-500 text-xs font-medium mt-3 text-left">{dateError}</p>}
          </div>

          {/* Quick stats */}
          <div className="mt-10 flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: '4.9★', label: 'Guest Rating' },
              { value: '15+', label: 'Room Types' },
              { value: '10+', label: 'Years of Excellence' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-accent drop-shadow-md">{stat.value}</div>
                <div className="text-xs text-white/60 uppercase tracking-wider font-semibold mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rooms Section ──────────────────────────────────────────── */}
      <section id="rooms" className="relative z-10 container mx-auto px-6 py-24 scroll-mt-24">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-accent mb-3 block">Accommodations</span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">Curated Suites & Villas</h2>
          <p className="text-foreground/60 max-w-xl mx-auto text-base">Every space is a sanctuary — designed with intent, furnished with purpose.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {rooms.map((room, i) => (
              <div key={room.id} className="group relative bg-card/50 backdrop-blur-md rounded-3xl overflow-hidden border border-primary/10 hover:border-accent/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/8 flex flex-col">
                {/* Image */}
                <div className="h-72 relative overflow-hidden">
                  {room.imageUrls?.[0] ? (
                    <img src={room.imageUrls[0]} alt={room.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-foreground/30 bg-primary/5 text-sm">No Image</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
                  {/* Badges */}
                  <div className="absolute top-5 left-5 flex gap-2">
                    {i === 0 && (
                      <span className="bg-accent text-background text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">Most Popular</span>
                    )}
                  </div>
                  <div className="absolute top-5 right-5 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold border border-primary/10 shadow">
                    Up to {room.maxOccupancy} guests
                  </div>
                  {/* Room name on image */}
                  <div className="absolute bottom-5 left-6 right-6">
                    <h3 className="text-2xl font-serif font-bold text-white drop-shadow-lg">{room.name}</h3>
                  </div>
                </div>

                {/* Details */}
                <div className="p-7 flex-1 flex flex-col justify-between">
                  <p className="text-foreground/60 text-sm leading-relaxed mb-6 line-clamp-2 font-light">{room.description}</p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Free Wi-Fi', 'Daily Housekeeping', 'Room Service'].map(f => (
                      <span key={f} className="text-[11px] font-semibold bg-primary/8 text-foreground/60 border border-primary/15 px-3 py-1 rounded-full">{f}</span>
                    ))}
                  </div>

                  <div className="flex items-end justify-between border-t border-primary/10 pt-5">
                    <div>
                      <span className="text-[11px] text-foreground/40 uppercase tracking-wider block mb-1">from</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-accent">฿{Number(room.price || 1500).toLocaleString()}</span>
                        <span className="text-xs text-foreground/50 font-medium">/ night</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleCheckAvailability}
                      className="rounded-full px-7 h-11 bg-primary hover:bg-primary-light text-primary-foreground shadow-md hover:shadow-primary/30 transition-all duration-300 font-semibold"
                    >
                      Reserve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Amenities Section ──────────────────────────────────────── */}
      <section id="amenities" className="relative z-10 bg-primary/5 border-y border-primary/10 py-24 scroll-mt-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-accent mb-3 block">What We Offer</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">World-Class Amenities</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">Every detail considered, every comfort delivered.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {AMENITIES.map((a) => (
              <div key={a.title} className="flex gap-5 items-start p-6 bg-card/60 backdrop-blur-md rounded-2xl border border-primary/10 hover:border-accent/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  {a.icon}
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 text-base">{a.title}</h3>
                  <p className="text-sm text-foreground/55 leading-relaxed font-light">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="container mx-auto px-6 max-w-3xl relative">
          <svg className="w-12 h-12 text-accent/30 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="text-3xl md:text-4xl font-serif italic text-foreground/85 leading-snug mb-6">
            "The details are not the details. They make the design."
          </p>
          <span className="text-accent font-bold tracking-widest uppercase text-xs">— Charles Eames</span>
        </div>
      </section>

      {/* ── Second Booking CTA ─────────────────────────────────────── */}
      <section className="relative z-10 bg-primary/10 border-t border-primary/20 py-20 text-center">
        <div className="container mx-auto px-6 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Ready for Your Stay?</h2>
          <p className="text-foreground/60 mb-8 text-lg font-light">Your suite is waiting. Unforgettable moments begin with a single reservation.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleCheckAvailability}
              size="lg"
              className="px-10 h-13 rounded-full bg-primary hover:bg-primary-light text-primary-foreground shadow-xl hover:shadow-primary/30 font-semibold text-base transition-all duration-300"
            >
              Check Availability — {nightCount > 0 ? `${nightCount} Night${nightCount !== 1 ? 's' : ''}` : 'Select Dates'}
            </Button>
          </div>
          {checkIn && checkOut && (
            <p className="text-sm text-foreground/40 mt-4 font-medium">
              {new Date(checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' → '}
              {new Date(checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-primary/10 py-10 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/40">
          <div className="font-serif font-bold text-lg text-foreground/70">
            <span className="text-gradient">Royal</span> Amethyst
          </div>
          <p>© {new Date().getFullYear()} Royal Amethyst. All rights reserved.</p>
          <p>All prices in THB (฿) · Asia/Bangkok</p>
        </div>
      </footer>
    </main>
  );
}
