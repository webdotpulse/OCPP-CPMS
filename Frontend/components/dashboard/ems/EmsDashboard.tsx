"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { EnergyFlow } from './EnergyFlow';
import { EnergyHistoryChart } from './EnergyHistoryChart';
import { Loader2 } from "lucide-react";

interface EmsTelemetry {
  gateway_id: string;
  solar_kw: number;
  battery_kw: number;
  grid_kw: number;
  house_kw: number;
  timestamp: string;
}

export function EmsDashboard() {
  const [telemetry, setTelemetry] = useState<EmsTelemetry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGatewayId, setActiveGatewayId] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      const response = await api.get('/dashboard/ems-telemetry');
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setTelemetry(response.data);
        if (!activeGatewayId) {
          setActiveGatewayId(response.data[0].gateway_id);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch EMS telemetry', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (telemetry.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground text-lg mb-2">No EMS Gateways Linked</p>
          <p className="text-sm text-muted-foreground">Register an EMS Gateway hardware device to view real-time site energy telemetry.</p>
        </CardContent>
      </Card>
    );
  }

  const activeTelemetry = telemetry.find(t => t.gateway_id === activeGatewayId) || telemetry[0];

  return (
    <div className="space-y-6">
      {telemetry.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {telemetry.map(t => (
            <button
              key={t.gateway_id}
              onClick={() => setActiveGatewayId(t.gateway_id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeGatewayId === t.gateway_id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Gateway {t.gateway_id.substring(0, 8)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1 border-2 shadow-md">
          <CardHeader>
            <CardTitle>Live Power Flow</CardTitle>
            <CardDescription>Real-time energy distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[400px]">
             <EnergyFlow telemetry={activeTelemetry} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 border-2 shadow-md">
          <CardHeader>
            <CardTitle>24-Hour Energy Profile</CardTitle>
            <CardDescription>Historical overlay of generation vs. consumption</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
             <EnergyHistoryChart gatewayId={activeTelemetry.gateway_id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
