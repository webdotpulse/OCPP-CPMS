"use client";

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { formatDistanceToNow } from 'date-fns';
import { MobileSpeedOverride } from '@/components/chargers/MobileSpeedOverride';
import { Zap } from 'lucide-react';

export function MobileDashboard() {
  const sessions = useTelemetryStore((state) => state.sessions);
  const isSessionsLoading = useTelemetryStore((state) => state.isSessionsLoading);
  const fetchSessions = useTelemetryStore((state) => state.fetchSessions);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Active Sessions</h2>
          <p className="text-sm text-muted-foreground">Live charging transactions</p>
        </div>
        <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
          <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
          Live
        </Badge>
      </div>

      {isSessionsLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="flex justify-center p-8 text-muted-foreground border border-dashed rounded-lg bg-card">
          No active sessions currently.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.transactionId} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      {session.chargerName}
                    </CardTitle>
                    <CardDescription>
                      Connector: {session.connectorName}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    #{session.transactionId}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-lg">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Started</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Energy</p>
                    <p className="font-medium text-primary">
                      {session.energyConsumed > 0 ? `${(session.energyConsumed / 1000).toFixed(2)} kWh` : 'Starting...'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <MobileSpeedOverride
                    chargerId={session.chargerId}
                    currentPower={session.currentPower}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
