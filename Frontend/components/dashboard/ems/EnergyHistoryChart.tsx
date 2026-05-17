import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface EnergyHistoryChartProps {
  gatewayId: string;
}

export function EnergyHistoryChart({ gatewayId }: EnergyHistoryChartProps) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/dashboard/ems-telemetry/history?hours=24`);
        if (res.data !== undefined && res.data) {
          // Filter data for the active gateway and format it for recharts
          const filtered = res.data.filter((item: any) => item.gateway_id === gatewayId);
          const formatted = filtered.map((item: any) => ({
            time: format(new Date(item.timestamp), 'HH:mm'),
            solar: item.solar_kw,
            grid: item.grid_kw, // Positive is import, negative is export
            house: item.house_kw,
            battery: item.battery_kw,
          }));
          setData(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch historical EMS telemetry", err);
      }
    };

    fetchHistory();
    const int = setInterval(fetchHistory, 60000); // refresh history every minute
    return () => clearInterval(int);
  }, [gatewayId]);

  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Waiting for historical data...</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorHouse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
        <XAxis
          dataKey="time"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value} kW`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value: any) => [`${Number(value).toFixed(2)} kW`]}
        />
        <Legend />
        <Area type="monotone" dataKey="solar" name="Solar Production" stroke="#eab308" fillOpacity={1} fill="url(#colorSolar)" />
        <Area type="monotone" dataKey="grid" name="Grid (Import+ / Export-)" stroke="#ef4444" fillOpacity={1} fill="url(#colorGrid)" />
        <Area type="monotone" dataKey="house" name="House Load" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHouse)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
