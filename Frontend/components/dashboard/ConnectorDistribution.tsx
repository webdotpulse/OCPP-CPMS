"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DistributionData {
  status: string;
  count: number;
}

const COLORS = {
  Available: '#10b981',   // emerald-500
  Charging: '#3b82f6',    // blue-500
  Faulted: '#ef4444',     // red-500
  Unavailable: '#6b7280', // gray-500
  Preparing: '#f59e0b',   // amber-500
  Finishing: '#8b5cf6',   // violet-500
};

export function ConnectorDistribution() {
  const [data, setData] = useState<DistributionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDistribution = async () => {
      try {
        const response = await api.get('/dashboard/distribution');
        const payload = response.data;
        if (payload?.distribution) {
          const chartData = Object.entries(payload.distribution).map(([status, details]: [string, any]) => ({
            status,
            count: details.count,
          }));
          setData(chartData);
        } else {
          setData([]);
        }
      } catch (error) {
        logger.error('Failed to fetch distribution metrics', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDistribution();
  }, []);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Connector Status</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center">
        {isLoading ? (
          <div className="text-muted-foreground">Loading chart...</div>
        ) : data.length === 0 ? (
          <div className="text-muted-foreground">No data available</div>
        ) : (
          <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
                nameKey="status"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.status as keyof typeof COLORS] || COLORS.Unavailable} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
