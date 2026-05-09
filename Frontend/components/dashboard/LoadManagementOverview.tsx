"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { Progress } from "@/components/ui/progress";
import { Zap, Loader2 } from "lucide-react";

interface LoadMetric {
  id: number;
  name: string;
  type: string;
  maxPower: number;
  currentLoad: number;
  activeChargers: number;
}

interface LoadManagementOverviewProps {
  chargerId: string | number;
}

export function LoadManagementOverview({ chargerId }: LoadManagementOverviewProps) {
  const [metrics, setMetrics] = useState<LoadMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChargerLoad = async () => {
      try {
        // Fetch specific charger details to find the group and station
        const chargerResponse = await api.get(`/chargers/${chargerId}`);
        const charger = chargerResponse.data;

        // Fetch all load metrics
        const loadResponse = await api.get('/dashboard/load');
        const allMetrics: LoadMetric[] = loadResponse.data;

        if (charger && allMetrics) {
          // Filter metrics to show the station and charge group this charger belongs to
          const relevantMetrics = allMetrics.filter(m =>
            (m.type === 'station' && m.id === charger.charging_station_id) ||
            (m.type === 'group' && m.id === charger.chargeGroupId)
          );

          setMetrics(relevantMetrics);
        }
      } catch (error) {
        logger.error('Failed to fetch load metrics for charger', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChargerLoad();
    // Refresh every 30 seconds
    const interval = setInterval(fetchChargerLoad, 30000);
    return () => clearInterval(interval);
  }, [chargerId]);

  if (isLoading && metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" /> Smart Charging Load
          </CardTitle>
          <CardDescription>Real-time power distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return null; // Don't show if no sites/groups have maxPower configured
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" /> Smart Charging Load
        </CardTitle>
        <CardDescription>Real-time power distribution vs capacity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => {
          const loadPercentage = metric.maxPower > 0 ? (metric.currentLoad / metric.maxPower) * 100 : 0;
          const isWarning = loadPercentage > 85;
          const isCritical = loadPercentage > 95;

          let progressColor = "bg-primary";
          if (isCritical) progressColor = "bg-destructive";
          else if (isWarning) progressColor = "bg-yellow-500";

          return (
            <div key={`${metric.type}-${metric.id}`} className="space-y-2">
              <div className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{metric.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({metric.type})</span>
                </div>
                <div className="font-medium">
                  {metric.currentLoad.toFixed(1)}kW / {metric.maxPower}kW
                </div>
              </div>
              <Progress value={Math.min(loadPercentage, 100)} className="h-2" indicatorColor={progressColor} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{metric.activeChargers} active charger(s)</span>
                <span>{loadPercentage.toFixed(1)}% Load</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
