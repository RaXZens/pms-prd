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
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="font-bold text-lg text-primary">Royal Admin</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${pathname === item.href ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}>
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/">
            <div className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 cursor-pointer">
              ← Back to Site
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-card border-b border-border flex items-center px-8">
          <h2 className="font-semibold text-lg">{navItems.find(i => i.href === pathname)?.label || 'Dashboard'}</h2>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
