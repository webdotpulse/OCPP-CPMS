import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  MapPin,
  CreditCard,
  Banknote,
  Settings,
  TerminalSquare,
  WalletCards,
  Zap
} from 'lucide-react';

const routes = [
  { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
  { name: 'Stations', path: '/stations', icon: MapPin },
  { name: 'Chargers', path: '/chargers', icon: Zap },
  { name: 'Transactions', path: '/transactions', icon: Banknote },
  { name: 'RFID Tags', path: '/rfid', icon: CreditCard },
  { name: 'Tariffs', path: '/tariffs', icon: WalletCards },
  { name: 'OCPP Console', path: '/ocpp', icon: TerminalSquare },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
          <img src="/assets/images/favicon/favicon.svg" alt="MobilityPulse Logo" className="h-6 w-6" />
          <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent font-bold">MobilityPulse</span>
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {routes.map((route) => {
          const isActive = pathname.startsWith(route.path);
          const Icon = route.icon;
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {route.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground text-center">
        MobilityPulse CPMS v1.0
      </div>
    </aside>
  );
}
