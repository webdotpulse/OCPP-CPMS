import { AppShell } from '@/components/layout/AppShell';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { LiveSessionsTable } from '@/components/dashboard/LiveSessionsTable';
import { ConnectorDistribution } from '@/components/dashboard/ConnectorDistribution';
import { LocationsMap } from '@/components/dashboard/LocationsMap';

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
          <p className="text-muted-foreground">
            Monitor real-time metrics and charger status across your network.
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
