'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const [hasPendingBooking, setHasPendingBooking] = useState(false);
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);

  const fetchPendingStatus = () => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    apiClient.get(`/bookings?guestId=${userId}`)
      .then(data => {
        if (Array.isArray(data)) setHasPendingBooking(data.some((b: any) => b.status === 'PENDING' && b.paymentStatus !== 'PAID'));
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (session?.user) fetchPendingStatus();
  }, [(session?.user as any)?.id, pathname]);

  useEffect(() => {
    window.addEventListener('booking-confirmed', fetchPendingStatus);
    return () => window.removeEventListener('booking-confirmed', fetchPendingStatus);
  }, [(session?.user as any)?.id]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setAtTop(y < 10);
      if (y < 10) { setVisible(true); }
      else if (y > lastScrollY.current + 8) { setVisible(false); setDropdownOpen(false); }
      else if (y < lastScrollY.current - 8) { setVisible(true); }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const navScrollTo = (id: string) => {
    if (pathname === '/') {
      scrollTo(id);
    } else {
      router.push('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  };

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 pt-4 flex justify-center transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <nav className={`w-full max-w-6xl rounded-2xl border px-5 py-3 flex items-center justify-between gap-4 transition-all duration-300 ${atTop ? 'border-primary/10 bg-background/60 shadow-lg backdrop-blur-xl' : 'border-primary/20 bg-background/90 shadow-2xl backdrop-blur-xl'}`}>

        {/* Brand */}
        <Link href="/" className="text-xl font-serif font-bold tracking-wide shrink-0">
          <span className="text-gradient">Royal</span> Amethyst
        </Link>

        {/* Center nav */}
        <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
          <button onClick={() => navScrollTo('rooms')} className="px-4 py-2 rounded-full hover:bg-primary/10 text-foreground/70 hover:text-primary transition-colors">
            Rooms
          </button>

          {/* Services dropdown */}
          <div className="relative" ref={servicesRef}>
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className="flex items-center gap-1 px-4 py-2 rounded-full hover:bg-primary/10 text-foreground/70 hover:text-primary transition-colors"
            >
              Services
              <svg className={`w-3 h-3 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full mt-2 w-52 bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-2xl py-2 z-50">
                {[
                  { label: 'Spa & Wellness', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', desc: 'Rejuvenating treatments' },
                  { label: 'Fine Dining', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', desc: 'Award-winning cuisine' },
                  { label: 'Infinity Pool', icon: 'M3 10h18M3 14h18M10 3v18M14 3v18', desc: 'Sunrise to sunset' },
                  { label: 'Airport Transfer', icon: 'M13 10V3L4 14h7v7l9-11h-7z', desc: 'Complimentary private' },
                  { label: 'Concierge', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: '24/7 personal service' },
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => { setServicesOpen(false); navScrollTo('amenities'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/10 hover:text-primary transition-colors text-left mx-0 rounded-none first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={s.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground/80">{s.label}</p>
                      <p className="text-[10px] text-foreground/45">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {session && !isAdmin && (
            <Link href="/my-bookings" className={`relative px-4 py-2 rounded-full hover:bg-primary/10 transition-colors font-medium flex items-center gap-2 ${hasPendingBooking ? 'text-amber-600' : 'text-foreground/70 hover:text-primary'}`}>
              My Reservations
              {hasPendingBooking && (
                <span className="flex h-2 w-2 shrink-0 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </Link>
          )}
          {session && isAdmin && (
            <Link href="/dashboard" className="px-4 py-2 rounded-full hover:bg-primary/10 text-foreground/70 hover:text-primary transition-colors font-medium">
              Dashboard
            </Link>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {session ? (
            <div className="relative">
              <Button variant="ghost" onClick={() => setDropdownOpen(!dropdownOpen)} className="relative flex items-center gap-2 hover:bg-primary/10 rounded-full px-3 text-foreground/80 h-9">
                {hasPendingBooking && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                )}
                <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center uppercase">
                  {(session.user?.name || session.user?.email || '?')[0]}
                </span>
                <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
                  {session.user?.name || session.user?.email}
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </Button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-primary/10 mb-1">
                    <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">Signed in as</p>
                    <p className="text-sm font-medium text-foreground truncate">{session.user?.email}</p>
                  </div>

                  {isAdmin ? (
                    <>
                      {[
                        { href: '/dashboard', label: 'Admin Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                        { href: '/dashboard/bookings', label: 'Bookings', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                        { href: '/dashboard/rooms', label: 'Room Types', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                        { href: '/dashboard/calendar', label: 'Rate Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                      ].map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors font-medium mx-1 rounded-xl">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                          {item.label}
                        </Link>
                      ))}
                    </>
                  ) : (
                    <Link href="/my-bookings" onClick={() => setDropdownOpen(false)} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold transition-all mx-1 rounded-xl ${hasPendingBooking ? 'bg-amber-50/60 text-amber-800 hover:bg-amber-50 border border-amber-200/60' : 'text-foreground/80 hover:bg-primary/10 hover:text-primary'}`}>
                      <span className="flex items-center gap-3">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        My Reservations
                      </span>
                      {hasPendingBooking && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">Unpaid</span>}
                    </Link>
                  )}

                  <div className="border-t border-primary/10 mt-1 pt-1">
                    <button onClick={() => { setDropdownOpen(false); signOut(); }} className="w-[calc(100%-8px)] mx-1 text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors font-medium rounded-xl">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="hover:bg-primary/10 rounded-full px-4 text-foreground/80 h-9">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm" className="rounded-full px-4 border-primary/20 text-foreground/80 hover:bg-primary/10 h-9 hidden sm:flex">Register</Button>
              </Link>
            </div>
          )}
          <Button
            onClick={() => {
              if (window.location.pathname === '/') {
                document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                router.push('/');
              }
            }}
            size="sm"
            className="rounded-full px-5 h-9 bg-primary hover:bg-primary-light text-primary-foreground shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold"
          >
            Book Now
          </Button>
        </div>
      </nav>
    </div>
  );
}
