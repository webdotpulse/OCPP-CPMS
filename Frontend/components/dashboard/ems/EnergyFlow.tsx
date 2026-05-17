import React, { useEffect, useState, useRef } from 'react';
import { Sun, Battery, Home, Zap, ArrowRight, ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { api } from '@/lib/api';

interface Telemetry {
  solar_kw: number;
  battery_kw: number;
  grid_kw: number;
  house_kw: number;
}

interface EnergyFlowProps {
  telemetry: Telemetry;
}

export function EnergyFlow({ telemetry }: EnergyFlowProps) {
  const [chargersPower, setChargersPower] = useState(0);

  useEffect(() => {
    // Fetch live charger load
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
    fetchLoad();
    const int = setInterval(fetchLoad, 10000);
    return () => clearInterval(int);
  }, []);

  const Node = ({ icon: Icon, value, label, color, position }: any) => (
    <div className={`absolute flex flex-col items-center justify-center p-4 rounded-xl shadow-lg border-2 bg-card z-10 w-28 h-28 ${position} ${color}`}>
      <Icon className="w-8 h-8 mb-2" />
      <div className="font-bold text-lg">{Math.abs(value).toFixed(1)} kW</div>
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
    </div>
  );

  return (
    <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
      {/* Central Node */}
      <div className="absolute z-20 w-16 h-16 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.5)]">
         <div className="w-8 h-8 rounded-full bg-primary animate-pulse" />
      </div>

      {/* Nodes */}
      <Node
        icon={Sun}
        value={telemetry.solar_kw}
        label="Solar"
        color="border-yellow-500 text-yellow-500"
        position="top-0"
      />
      <Node
        icon={Battery}
        value={telemetry.battery_kw}
        label={telemetry.battery_kw >= 0 ? "Discharge" : "Charge"}
        color="border-green-500 text-green-500"
        position="left-0"
      />
      <Node
        icon={Home}
        value={telemetry.house_kw}
        label="House"
        color="border-blue-500 text-blue-500"
        position="bottom-0"
      />
      <Node
        icon={ArrowRight} // Fallback grid icon shape
        value={telemetry.grid_kw}
        label={telemetry.grid_kw >= 0 ? "Import" : "Export"}
        color={telemetry.grid_kw >= 0 ? "border-red-500 text-red-500" : "border-emerald-500 text-emerald-500"}
        position="right-0"
      />

      <div className="absolute bottom-[-100px] w-full flex justify-center">
         <Node
          icon={Zap}
          value={chargersPower}
          label="Chargers"
          color="border-purple-500 text-purple-500"
          position="static"
        />
      </div>

      {/* Connecting Lines SVG */}
      <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="grad-solar" x1="0%" y1="0%" x2="0%" y2="100%">
             <stop offset="0%" stopColor="#eab308" />
             <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
          <linearGradient id="grad-grid" x1="100%" y1="0%" x2="0%" y2="0%">
             <stop offset="0%" stopColor={telemetry.grid_kw >= 0 ? "#ef4444" : "#10b981"} />
             <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>

        {/* Solar Line */}
        <line x1="200" y1="112" x2="200" y2="170" stroke="url(#grad-solar)" strokeWidth="6" strokeDasharray="8 8" className={telemetry.solar_kw > 0 ? "animate-[dash_1s_linear_infinite]" : "opacity-30"} />

        {/* Grid Line */}
        <line x1="288" y1="200" x2="230" y2="200" stroke="url(#grad-grid)" strokeWidth="6" strokeDasharray="8 8" className={Math.abs(telemetry.grid_kw) > 0 ? (telemetry.grid_kw >= 0 ? "animate-[dash_1s_linear_infinite]" : "animate-[dash_1s_linear_infinite_reverse]") : "opacity-30"} />

        {/* Battery Line */}
        <line x1="112" y1="200" x2="170" y2="200" stroke="#22c55e" strokeWidth="6" strokeDasharray="8 8" className={Math.abs(telemetry.battery_kw) > 0 ? (telemetry.battery_kw >= 0 ? "animate-[dash_1s_linear_infinite]" : "animate-[dash_1s_linear_infinite_reverse]") : "opacity-30"} />

        {/* House Line */}
        <line x1="200" y1="230" x2="200" y2="288" stroke="#3b82f6" strokeWidth="6" strokeDasharray="8 8" className={telemetry.house_kw > 0 ? "animate-[dash_1s_linear_infinite]" : "opacity-30"} />

        {/* Charger Line */}
         <line x1="200" y1="288" x2="200" y2="350" stroke="#a855f7" strokeWidth="6" strokeDasharray="8 8" className={chargersPower > 0 ? "animate-[dash_1s_linear_infinite]" : "opacity-30"} />

      </svg>
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -16; }
        }
      `}</style>
    </div>
  );
}
