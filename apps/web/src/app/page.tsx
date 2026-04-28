'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';

export default function Home() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/room-types')
      .then(data => {
        setRooms(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load room types:', err);
        setLoading(false);
      });
  }, []);

  const scrollToDiscover = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('discover');
    if (element) {
      const offset = 120; // safe padding for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      {/* Premium Floating Navigation */}
      <div className="fixed top-6 left-0 right-0 z-50 px-4 md:px-0 flex justify-center">
        <nav className="glass-panel w-full max-w-5xl rounded-full border border-white/20 shadow-2xl px-6 py-3 flex items-center justify-between bg-white/40 backdrop-blur-xl">
          <div className="text-2xl font-bold tracking-tighter">
            <span className="text-gradient">Royal</span> Amethyst
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {session ? (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:bg-white/20 rounded-full px-4"
                >
                  <span className="text-sm font-medium text-foreground">
                    {session.user?.name || session.user?.email}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in-up overflow-hidden">
                    {(session.user as any)?.role === 'ADMIN' && (
                      <>
                        <Link 
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-5 py-3 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                        >
                          Admin Dashboard
                        </Link>
                        <div className="border-t border-gray-100 my-1" />
                      </>
                    )}
                    {(session.user as any)?.role !== 'ADMIN' && (
                      <>
                        <Link 
                          href="/my-bookings"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-5 py-3 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors font-medium"
                        >
                          My Reservations
                        </Link>
                        <div className="border-t border-gray-100 my-1" />
                      </>
                    )}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left block px-5 py-3 text-sm text-red-600 hover:bg-red-50/50 transition-colors font-medium"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="hover:bg-white/20 rounded-full px-5">Sign In</Button>
              </Link>
            )}
            <Link href="/book">
              <Button className="rounded-full px-6 shadow-md hover:shadow-lg transition-all">
                Book Now
              </Button>
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-32 pb-24 text-center">
        <div className="animate-fade-in-up">
          <span className="px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium tracking-wide uppercase mb-6 inline-block">
            Experience Unrivaled Luxury
          </span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 text-foreground">
            A New Standard of <br />
            <span className="text-gradient">Elegance</span>
          </h1>
          <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Discover a world where impeccable service meets architectural brilliance. 
            Book your stay today and immerse yourself in the Royal Amethyst experience.
          </p>
          
          <div className="flex items-center justify-center gap-6 animate-delay-200">
            <Link href="/book">
              <Button size="lg" className="text-lg px-10 rounded-full">
                Reserve Your Stay
              </Button>
            </Link>
            <Button onClick={scrollToDiscover} size="lg" variant="outline" className="text-lg px-10 rounded-full">
              Discover More
            </Button>
          </div>
        </div>
      </section>

      {/* Discover Section - Room Types */}
      <section id="discover" className="relative z-10 container mx-auto px-6 pb-24 border-t border-gray-100 pt-20 scroll-mt-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Our Luxurious Accommodations</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Choose from our curated collection of high-end rooms and suites, designed exclusively for your comfort.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 flex flex-col group hover:-translate-y-2 transition-all duration-300">
                <div className="h-64 relative bg-gray-100 overflow-hidden">
                  {room.imageUrls?.[0] ? (
                    <img src={room.imageUrls[0]} alt={room.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-primary shadow-sm">
                    Max: {room.maxOccupancy} Guests
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-primary transition-colors">{room.name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3">{room.description}</p>
                  </div>
                  <div className="flex items-center justify-between border-t pt-6">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Standard Rate</span>
                      <span className="text-2xl font-black text-gray-900">฿{Number(room.price || 1500).toFixed(2)}</span>
                      <span className="text-xs text-gray-500 font-medium"> / night</span>
                    </div>
                    <Link href="/book">
                      <Button className="rounded-full px-6 shadow-sm group-hover:shadow-md transition-all">
                        Book Room
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
