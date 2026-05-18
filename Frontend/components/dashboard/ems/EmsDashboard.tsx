"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { EnergyFlow } from './EnergyFlow';
import { EnergyHistoryChart } from './EnergyHistoryChart';
import { Loader2, ArrowRightLeft, Sun, Battery, Zap } from "lucide-react";

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
  const [chargersPower, setChargersPower] = useState(0);

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

  const fetchLoad = async () => {
    try {
      const res = await api.get('/dashboard/load');
      if (res.data !== undefined && res.data) {
        const load = res.data.reduce((sum: number, item: any) => sum + (item.currentLoad || 0), 0);
        setChargersPower(load);
      }
    } catch (err) {
      console.error("Failed to fetch chargers load", err);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    fetchLoad();
    const interval = setInterval(() => {
      fetchTelemetry();
      fetchLoad();
    }, 5000); // Poll every 5s
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
  const totalLoad = activeTelemetry.house_kw + chargersPower;

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

      {/* Full width Flow Chart */}
      <div className="mb-8">
        <EnergyFlow telemetry={activeTelemetry} chargersPower={chargersPower} />
      </div>

      {/* Grid of Summary Cards matching NEMS layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Grid Power Card */}
        <Card className="overflow-hidden shadow rounded-lg border">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Grid Power</dt>
                  <dd>
                    <div className="text-lg font-medium text-foreground">
                      {Math.abs(activeTelemetry.grid_kw * 1000).toFixed(0)} W
                    </div>
                    <div className={`text-sm ${activeTelemetry.grid_kw > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                      {activeTelemetry.grid_kw > 0 ? 'Importing' : (activeTelemetry.grid_kw < 0 ? 'Exporting' : 'Idle')}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Solar Power Card */}
        <Card className="overflow-hidden shadow rounded-lg border">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Sun className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Solar Power</dt>
                  <dd>
                    <div className="text-lg font-medium text-foreground">
                      {(activeTelemetry.solar_kw * 1000).toFixed(0)} W
                    </div>
                    <div className="text-sm text-yellow-500">Producing</div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Battery Power Card */}
        <Card className="overflow-hidden shadow rounded-lg border">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Battery className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Battery Power</dt>
                  <dd>
                    <div className="text-lg font-medium text-foreground">
                      {Math.abs(activeTelemetry.battery_kw * 1000).toFixed(0)} W
                    </div>
                    <div className={`text-sm ${activeTelemetry.battery_kw > 0 ? 'text-blue-500' : 'text-emerald-500'}`}>
                      {activeTelemetry.battery_kw > 0 ? 'Discharging' : (activeTelemetry.battery_kw < 0 ? 'Charging' : 'Idle')}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Load Card */}
        <Card className="overflow-hidden shadow rounded-lg border">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Total Load</dt>
                  <dd>
                    <div className="text-lg font-medium text-foreground">
                      {(totalLoad * 1000).toFixed(0)} W
                    </div>
                    <div className="text-sm text-purple-500">Consuming</div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 shadow-md">
        <CardHeader>
          <CardTitle>24-Hour Energy Profile</CardTitle>
          <CardDescription>Historical overlay of generation vs. consumption</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
           <EnergyHistoryChart gatewayId={activeTelemetry.gateway_id} />
        </CardContent>
      </Card>
    </div>
  );
}
