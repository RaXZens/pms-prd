'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Bookings', href: '/dashboard/bookings' },
    { label: 'Room Types', href: '/dashboard/rooms' },
    { label: 'Rate Calendar', href: '/dashboard/calendar' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="h-20 flex items-center px-8 border-b border-slate-100">
          <span className="font-serif font-bold text-xl tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Royal Admin</span>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Link href="/">
            <div className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-2 border border-transparent hover:border-slate-100 hover:shadow-sm">
              <span>←</span> Back to Site
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-10 justify-between shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
          <h2 className="font-serif font-bold text-2xl text-slate-900">
            {navItems.find(i => i.href === pathname)?.label || 'Dashboard'}
          </h2>
        </header>
        <main className="flex-1 p-10 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
