"use client";

import { useTranslation } from "react-i18next";
import { AppShell } from '@/components/layout/AppShell';
import { V2GSoCSlider } from '@/components/energy/V2GSoCSlider';
import { FleetBatteryCapacityWidget } from '@/components/energy/FleetBatteryCapacityWidget';

export default function V2GPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('nav.v2g')}</h2>
          <p className="text-muted-foreground">
            Configure Vehicle-to-Grid orchestration settings and view available fleet capacity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FleetBatteryCapacityWidget />
          <V2GSoCSlider />
        </div>
      </div>
    </AppShell>
  );
}
