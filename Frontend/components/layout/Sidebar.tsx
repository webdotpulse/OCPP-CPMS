import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3,
  MapPin,
  CreditCard,
  Banknote,
  Settings,
  TerminalSquare,
  WalletCards,
  Zap,
  Users,
  Menu,
} from 'lucide-react';

const routes = [
  { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
  { name: 'Customers', path: '/users', icon: Users, adminOnly: true },
  { name: 'Locations', path: '/stations', icon: MapPin },
  { name: 'Chargers', path: '/chargers', icon: Zap },
  { name: 'Charge Groups', path: '/charge-groups', icon: Users },
  { name: 'RFID Tags', path: '/rfid', icon: CreditCard },
  { name: 'Tariffs', path: '/tariffs', icon: WalletCards },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'OCPP Console', path: '/ocpp', icon: TerminalSquare },
];

export function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className={cn("border-r flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 bg-[#009C9F] dark:bg-slate-900 text-white", isCollapsed ? "w-16" : "w-64")}>
      <div className={cn("h-16 flex items-center border-b border-white/20 dark:border-white/10", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
        {!isCollapsed && (
          <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Image src="/assets/images/favicon/favicon.svg" alt="MobilityPulse Logo" width={24} height={24} className="h-6 w-6 filter brightness-0 invert" />
            <span className="font-bold">MobilityPulse</span>
          </h1>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-white/10 rounded">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {routes.map((route) => {
          if (route.adminOnly && user?.role !== 'admin') return null;
          const isActive = pathname.startsWith(route.path);
          const Icon = route.icon;
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex items-center gap-3 py-2 rounded-md text-sm transition-colors",
                isCollapsed ? "justify-center px-0" : "px-3",
                isActive 
                  ? "bg-white/20 font-medium"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
              title={isCollapsed ? route.name : undefined}
            >
              <Icon className="h-5 w-5" />
              {!isCollapsed && route.name}
            </Link>
          );
        })}
      </nav>
      {!isCollapsed && (
        <div className="p-4 border-t border-white/20 text-xs text-white/60 text-center">
          MobilityPulse CPMS v1.0
        </div>
      )}
    </aside>
  );
}
