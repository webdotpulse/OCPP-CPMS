"use client";

import { useTranslation } from "react-i18next";
import { AppShell } from '@/components/layout/AppShell';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { LiveSessionsTable } from '@/components/dashboard/LiveSessionsTable';
import { ConnectorDistribution } from '@/components/dashboard/ConnectorDistribution';
import { LocationsMap } from '@/components/dashboard/LocationsMap';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isMobile) {
        router.push('/mobile/dashboard');
    }
  }, [mounted, isMobile, router]);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  if (isMobile) {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.systemOverview')}</h2>
          <p className="text-muted-foreground">
            {t('dashboard.systemOverviewDesc')}
          </p>
        </div>

        <KpiCards />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <LocationsMap />
          <div className="col-span-1 md:col-span-2 space-y-4">
            <ConnectorDistribution />
          </div>
        </div>

        <div className="mt-4">
          <LiveSessionsTable />
        </div>
      </div>
    </AppShell>
  );
}
