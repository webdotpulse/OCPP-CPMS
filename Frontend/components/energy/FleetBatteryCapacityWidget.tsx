import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { BatteryFull, Zap } from 'lucide-react';

export function FleetBatteryCapacityWidget() {
  const [capacity, setCapacity] = useState<{ availableKwh: number, connectedVehicles: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCapacity = async () => {
      try {
        // Mock endpoint or real implementation in future backend work
        const response = await api.get('/dashboard/fleet-capacity');
        setCapacity(response.data);
      } catch (error) {
        logger.error('Failed to fetch fleet capacity', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCapacity();
    const interval = setInterval(fetchCapacity, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !capacity) {
    return <Card className="animate-pulse h-32" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BatteryFull className="h-4 w-4 text-primary" />
            Fleet Battery Capacity
          </CardTitle>
          <CardDescription className="text-xs">
            Total energy available for V2G discharge
          </CardDescription>
        </div>
        <Zap className="h-8 w-8 text-yellow-500 opacity-20" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold tracking-tight">
            {capacity?.availableKwh?.toFixed(1) || "0.0"} <span className="text-sm font-normal text-muted-foreground">kWh</span>
          </span>
          <p className="text-xs text-muted-foreground">
            From {capacity?.connectedVehicles || 0} eligible connected vehicles
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
