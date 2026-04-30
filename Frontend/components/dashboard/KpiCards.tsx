"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Activity, Banknote, BatteryCharging } from 'lucide-react';

interface OverviewMetrics {
  totalChargers: number;
  activeSessions: number;
  energyToday: number;
  revenueToday: number;
}

export function KpiCards() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await api.get('/dashboard/overview');
        setMetrics(response.data);
      } catch (error) {
        logger.error('Failed to fetch overview metrics', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: 'Total Chargers',
      value: metrics?.totalChargers || 0,
      icon: Zap,
      description: 'Connected endpoints',
    },
    {
      title: 'Active Sessions',
      value: metrics?.activeSessions || 0,
      icon: Activity,
      description: 'Currently charging',
    },
    {
      title: 'Energy Today',
      value: `${metrics?.energyToday?.toFixed(2) || 0} kWh`,
      icon: BatteryCharging,
      description: 'Total dispensed',
    },
    {
      title: 'Revenue Today',
      value: `$${metrics?.revenueToday?.toFixed(2) || 0}`,
      icon: Banknote,
      description: 'Estimated post-paid',
    },
  ];

  if (isLoading && !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-transparent bg-muted rounded">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-1"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
