"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Wrench, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function HardwareAtRiskPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const response = await api.get("/diagnostics");

        // Ensure events is always an array
        let eventsData: any[] = [];
        if (Array.isArray(response.data)) {
          eventsData = response.data;
        } else if (response.data && Array.isArray(response.data.events)) {
          eventsData = response.data.events;
        } else if (response.data && Array.isArray(response.data.data)) {
          eventsData = response.data.data;
        }

        setEvents(eventsData);
      } catch (error) {
        console.error("Failed to fetch diagnostics", error);
        setEvents([]); // Fallback to empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppShell>
    );
  }

  // Derived state categories
  const recentEvents = events.filter((e) => new Date(e.timestamp) >= new Date(Date.now() - 24 * 60 * 60 * 1000));

  // Categorize chargers
  const chargersWithAttempts = new Set(events.filter(e => e.type === "AutoHealAttempt").map(e => e.chargerId));
  const chargersAtRisk = new Set(events.filter(e => e.type !== "AutoHealAttempt" && !e.resolved).map(e => e.chargerId));

  // "Requires Physical Maintenance" means it's still at risk, and maybe auto-heal failed or wasn't enough.
  // We define it here simply as chargers that are at risk.
  const requiresMaintenance = events.filter(e => chargersAtRisk.has(e.chargerId) && e.type !== "AutoHealAttempt");
  const autoHealAttempts = events.filter(e => e.type === "AutoHealAttempt");

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hardware at Risk</h1>
            <p className="text-muted-foreground">Predictive Maintenance & Auto-Healing Overview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Healthy (Placeholder/Stat) */}
          <Card className="col-span-1 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10">
            <CardHeader>
              <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Healthy Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-500">
                Active
              </div>
              <p className="text-sm text-emerald-600/80 mt-2">No critical hardware faults detected in other chargers.</p>
            </CardContent>
          </Card>

          {/* Auto-Healing Attempted */}
          <Card className="col-span-1 border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/10">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Auto-Healing Attempted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-500">
                {chargersWithAttempts.size}
              </div>
              <p className="text-sm text-blue-600/80 mt-2">Chargers revived or attempted via software reset.</p>
            </CardContent>
          </Card>

          {/* Requires Maintenance */}
          <Card className="col-span-1 border-destructive/20 bg-destructive/5 dark:bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> Requires Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-destructive">
                {chargersAtRisk.size}
              </div>
              <p className="text-sm text-destructive/80 mt-2">Physical technician rollout required.</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Diagnostic Events</CardTitle>
            <CardDescription>Live feed of hardware faults and automated CPMS interventions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] pr-4 overflow-y-auto">
              <div className="space-y-4">
                {events.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No diagnostic events recorded.</p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex gap-4 p-4 rounded-lg border bg-card">
                      <div className="mt-1">
                        {event.type === "AutoHealAttempt" ? (
                          <Wrench className="h-5 w-5 text-blue-500" />
                        ) : event.type === "HighTemperature" ? (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2">
                            Charger {event.charger?.name || event.chargerId}
                            {event.connectorId && <span className="text-muted-foreground font-normal text-sm">(Ch {event.connectorId})</span>}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), "MMM d, HH:mm:ss")}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant={event.type === "AutoHealAttempt" ? "secondary" : "destructive"}>
                            {event.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{event.description}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
