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
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-background text-foreground">
      {/* Luxury Background Mesh */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/10 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '15s' }} />

      {/* Floating Premium Navigation */}
      <div className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center">
        <nav className="w-full max-w-6xl rounded-full border border-primary/20 shadow-2xl px-6 py-4 flex items-center justify-between bg-background/60 backdrop-blur-xl">
          <div className="text-2xl font-serif font-bold tracking-wide">
            <span className="text-gradient">Royal</span> Amethyst
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:bg-primary/10 rounded-full px-4 text-foreground/80 hover:text-foreground"
                >
                  <span className="text-sm font-medium">
                    {session.user?.name || session.user?.email}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                    {(session.user as any)?.role === 'ADMIN' && (
                      <>
                        <Link 
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-5 py-3 text-sm text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        >
                          Admin Dashboard
                        </Link>
                        <div className="border-t border-primary/10 my-1" />
                      </>
                    )}
                    {(session.user as any)?.role !== 'ADMIN' && (
                      <>
                        <Link 
                          href="/my-bookings"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-5 py-3 text-sm text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        >
                          My Reservations
                        </Link>
                        <div className="border-t border-primary/10 my-1" />
                      </>
                    )}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left block px-5 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors font-medium"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="hover:bg-primary/10 rounded-full px-5 text-foreground/80 hover:text-foreground">Sign In</Button>
              </Link>
            )}
            <Link href="/book">
              <Button className="rounded-full px-6 bg-primary hover:bg-primary-light text-primary-foreground shadow-lg hover:shadow-primary/30 transition-all duration-300">
                Book Now
              </Button>
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-40 pb-24 text-center min-h-[90vh] flex flex-col justify-center items-center">
        <div className="animate-fade-in-up">
          <span className="px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-semibold tracking-widest uppercase mb-6 inline-block">
            Experience Unrivaled Luxury
          </span>
          <h1 className="text-6xl md:text-8xl font-serif font-bold tracking-tight mb-8 text-foreground leading-tight">
            A New Standard of <br />
            <span className="text-gradient">Elegance</span>
          </h1>
          <p className="text-xl text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Discover a world where impeccable service meets architectural brilliance. 
            Book your stay today and immerse yourself in the Royal Amethyst experience.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-delay-200">
            <Link href="/book">
              <Button size="lg" className="text-lg px-10 rounded-full bg-primary hover:bg-primary-light text-primary-foreground shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto">
                Reserve Your Stay
              </Button>
            </Link>
            <Button onClick={scrollToDiscover} size="lg" variant="outline" className="text-lg px-10 rounded-full border-primary/30 hover:bg-primary/10 text-foreground w-full sm:w-auto transition-all duration-300">
              Discover More
            </Button>
          </div>
        </div>
      </section>

      {/* Discover Section - Room Types */}
      <section id="discover" className="relative z-10 container mx-auto px-6 pb-32 border-t border-primary/10 pt-24 scroll-mt-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">Our Luxurious Accommodations</h2>
          <p className="text-foreground/60 max-w-xl mx-auto text-lg">Choose from our curated collection of high-end rooms and suites, designed exclusively for your comfort.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {rooms.map((room) => (
              <div key={room.id} className="group relative bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden border border-primary/10 flex flex-col hover:border-accent/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
                <div className="h-80 relative overflow-hidden">
                  {room.imageUrls?.[0] ? (
                    <img src={room.imageUrls[0]} alt={room.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-foreground/40 bg-primary/5">No Image</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-6 right-6 bg-background/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-accent shadow-lg border border-primary/10">
                    Max: {room.maxOccupancy} Guests
                  </div>
                </div>
                
                <div className="p-8 flex-1 flex flex-col justify-between relative z-10">
                  <div>
                    <h3 className="text-3xl font-serif font-bold mb-4 text-foreground group-hover:text-accent transition-colors duration-300">{room.name}</h3>
                    <p className="text-foreground/70 text-base leading-relaxed mb-8 line-clamp-3 font-sans">{room.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-primary/10 pt-6">
                    <div>
                      <span className="text-xs text-foreground/50 block mb-1 uppercase tracking-wider">Standard Rate</span>
                      <span className="text-3xl font-bold text-accent">฿{Number(room.price || 1500).toFixed(2)}</span>
                      <span className="text-xs text-foreground/60 font-medium"> / night</span>
                    </div>
                    <Link href="/book">
                      <Button className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-md hover:shadow-lg">
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

      {/* Luxury Quote Section */}
      <section className="relative z-10 bg-primary/10 py-24 text-center border-y border-primary/20">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-3xl md:text-4xl font-serif italic text-foreground/90 leading-snug mb-6">
            "The details are not the details. They make the design."
          </p>
          <span className="text-accent font-semibold tracking-widest uppercase text-sm">- Charles Eames</span>
        </div>
      </section>
    </main>
  );
}
