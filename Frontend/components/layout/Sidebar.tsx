import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  BarChart3,
  MapPin,
  CreditCard,
  Settings,
  TerminalSquare,
  WalletCards,
  Zap,
  Users,
  Menu,
  ReceiptText,
  Globe,
  Activity,
  Monitor,
  Car,
  AlertCircle
} from 'lucide-react';

const baseRoutes = [
  { key: 'nav.dashboard', path: '/dashboard', icon: BarChart3 },
  { key: 'nav.customers', path: '/users', icon: Users, adminOnly: true },
  { key: 'nav.locations', path: '/stations', icon: MapPin },
  { key: 'nav.chargers', path: '/chargers', icon: Zap },
  { key: 'nav.chargeGroups', path: '/charge-groups', icon: Users },
  { key: 'nav.rfidTags', path: '/rfid', icon: CreditCard },
  { key: 'nav.vehicleIdentity', path: '/vehicle-identity-management', icon: Car },
  { key: 'nav.transactions', path: '/transactions', icon: ReceiptText },
  // { key: 'nav.payments', path: '/payments', icon: CreditCard },
  // { key: 'nav.reimbursements', path: '/reimbursements', icon: ReceiptText },
  { key: 'nav.tariffs', path: '/tariffs', icon: WalletCards },
  { key: 'nav.hardwareAtRisk', path: '/hardware-at-risk', icon: AlertCircle },
  // { key: 'nav.v2g', path: '/v2g', icon: Car },
  { key: 'nav.ocppConsole', path: '/ocpp', icon: TerminalSquare, adminOnly: true },
];

export function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [hasEms, setHasEms] = useState(false);
  const [liveViewStationId, setLiveViewStationId] = useState<string | null>(null);

  useEffect(() => {
    const checkUserFeatures = async () => {
      if (!user) return;
      try {
        // Check EMS
        const resEms = await api.get('/ems-gateways');
        if (resEms.data && resEms.data.length > 0) {
          setHasEms(true);
        }

        // Check if regular user has any station with ground plan
        if (user.role !== 'admin') {
           const resStations = await api.get('/stations');
           const stations = resStations.data?.data || resStations.data || [];
           const stationWithPlan = stations.find((s: any) => s.isGroundPlanEnabled);
           if (stationWithPlan) {
              setLiveViewStationId(stationWithPlan.id.toString());
           }
        }
      } catch (error) {
        // Silently ignore errors
      }
    };
    checkUserFeatures();
  }, [user]);

  const routes = [...baseRoutes];
  if (hasEms) {
    routes.splice(1, 0, { key: 'nav.emsDashboard', path: '/energy', icon: Activity, adminOnly: false });
  }

  if (liveViewStationId && user?.role !== 'admin') {
    routes.splice(1, 0, { key: 'Live View', path: `/stations/${liveViewStationId}/live`, icon: Monitor, adminOnly: false });
  }

  return (
    <aside className={cn("border-r flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 bg-[#009C9F] dark:bg-slate-900 text-white", isCollapsed ? "w-16" : "w-64")}>
      <div className={cn("h-16 flex items-center border-b border-white/20 dark:border-white/10", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
        {!isCollapsed && (
          <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">OCPP CMS</span>
          </h1>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-white/10 rounded">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {routes.map((route) => {
          if (route.adminOnly && user?.role !== 'admin') return null;
          const isActive = (pathname || "").startsWith(route.path);
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
              title={isCollapsed ? t(route.key) : undefined}
            >
              <Icon className="h-5 w-5" />
              {!isCollapsed && t(route.key)}
            </Link>
          );
        })}
      </nav>
      {!isCollapsed && (
        <div className="p-4 border-t border-white/20 text-xs text-white/60 text-center">
          OCPP CMS v1.0
        </div>
      )}
    </aside>
  );
}
