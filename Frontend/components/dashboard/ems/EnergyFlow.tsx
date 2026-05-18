import React, { useEffect, useState } from 'react';
import { Sun, Battery, Home, Zap, ArrowRightLeft } from 'lucide-react';

interface Telemetry {
  solar_kw: number;
  battery_kw: number;
  grid_kw: number;
  house_kw: number;
}

interface EnergyFlowProps {
  telemetry: Telemetry;
  chargersPower: number;
}

interface FlowSegment {
  id: string;
  path: string;
  color: string;
  power: number;
  normalIsPositive: boolean;
}

export function EnergyFlow({ telemetry, chargersPower }: EnergyFlowProps) {
  const [activeSegments, setActiveSegments] = useState<FlowSegment[]>([]);

  const formatPowerSimple = (powerKw: number) => {
    const absPowerW = Math.abs(powerKw * 1000);
    if (absPowerW < 1000) {
      return `${Math.round(absPowerW)} W`;
    }
    const valKw = (absPowerW / 1000).toFixed(1);
    return `${valKw} kW`;
  };

  const totalLoad = telemetry.house_kw + chargersPower;

  // Flow animation logic mapped from PowerFlow.vue
  useEffect(() => {
    // Convert to watts to match original logic magnitude
    const solarGen = telemetry.solar_kw * 1000;
    const batteryPwr = telemetry.battery_kw * 1000;
    const gridPwr = telemetry.grid_kw * 1000;
    const houseLoad = telemetry.house_kw * 1000;
    const evLoad = chargersPower * 1000;

    let remainingSolar = Math.max(0, solarGen);
    let remainingBatteryDischarge = Math.max(0, batteryPwr);
    let remainingGridImport = Math.max(0, gridPwr);

    let homeLoadRemaining = Math.max(0, houseLoad);
    let evLoadRemaining = Math.max(0, evLoad);
    let batteryChargeRemaining = Math.max(0, -batteryPwr);
    let gridExportRemaining = Math.max(0, -gridPwr);

    const segments: FlowSegment[] = [];

    const addSegment = (source: string, target: string, power: number, color: string) => {
      if (power <= 0) return;
      let path = '';

      // Node positions: Grid (15, 50), Solar (50, 20), Battery (50, 80), Home (85, 50), EV (85, 80)
      if (source === 'solar') {
        if (target === 'home') path = 'M 50 20 C 50 45, 55 45, 85 45'; // Top center to right middle
        if (target === 'grid') path = 'M 50 20 C 50 48, 45 48, 15 48'; // Top center to left middle
        if (target === 'battery') path = 'M 50 20 L 50 80'; // Top center to bottom center
        if (target === 'ev') path = 'M 50 20 C 50 80, 50 80, 85 80'; // Top center to bottom right
      } else if (source === 'battery') {
        if (target === 'home') path = 'M 50 80 C 50 55, 55 55, 85 55'; // Bottom center to right middle
        if (target === 'grid') path = 'M 50 80 C 50 52, 45 52, 15 52'; // Bottom center to left middle
        if (target === 'ev') path = 'M 50 80 L 85 80'; // Bottom center to bottom right
      } else if (source === 'grid') {
        if (target === 'home') path = 'M 15 50 L 85 50'; // Left middle to right middle
        if (target === 'battery') path = 'M 15 52 C 45 52, 45 52, 50 80'; // Left middle to bottom center
        if (target === 'ev') path = 'M 15 50 C 45 50, 45 80, 85 80'; // Left middle to bottom right
      }

      if (path) {
        segments.push({ id: `${source}-${target}`, path, color, power, normalIsPositive: true });
      }
    };

    // 1. Solar fulfills loads first
    if (remainingSolar > 0) {
      const solarToHome = Math.min(remainingSolar, homeLoadRemaining);
      if (solarToHome > 0) { addSegment('solar', 'home', solarToHome, '#eab308'); remainingSolar -= solarToHome; homeLoadRemaining -= solarToHome; }
      const solarToEV = Math.min(remainingSolar, evLoadRemaining);
      if (solarToEV > 0) { addSegment('solar', 'ev', solarToEV, '#eab308'); remainingSolar -= solarToEV; evLoadRemaining -= solarToEV; }
      const solarToBattery = Math.min(remainingSolar, batteryChargeRemaining);
      if (solarToBattery > 0) { addSegment('solar', 'battery', solarToBattery, '#eab308'); remainingSolar -= solarToBattery; batteryChargeRemaining -= solarToBattery; }
      const solarToGrid = Math.min(remainingSolar, gridExportRemaining);
      if (solarToGrid > 0) { addSegment('solar', 'grid', solarToGrid, '#eab308'); remainingSolar -= solarToGrid; gridExportRemaining -= solarToGrid; }
    }

    // 2. Battery fulfills remaining loads
    if (remainingBatteryDischarge > 0) {
      const batteryToHome = Math.min(remainingBatteryDischarge, homeLoadRemaining);
      if (batteryToHome > 0) { addSegment('battery', 'home', batteryToHome, '#10b981'); remainingBatteryDischarge -= batteryToHome; homeLoadRemaining -= batteryToHome; }
      const batteryToEV = Math.min(remainingBatteryDischarge, evLoadRemaining);
      if (batteryToEV > 0) { addSegment('battery', 'ev', batteryToEV, '#10b981'); remainingBatteryDischarge -= batteryToEV; evLoadRemaining -= batteryToEV; }
      const batteryToGrid = Math.min(remainingBatteryDischarge, gridExportRemaining);
      if (batteryToGrid > 0) { addSegment('battery', 'grid', batteryToGrid, '#10b981'); remainingBatteryDischarge -= batteryToGrid; gridExportRemaining -= batteryToGrid; }
    }

    // 3. Grid fulfills any remaining loads
    if (remainingGridImport > 0) {
      const gridToHome = Math.min(remainingGridImport, homeLoadRemaining);
      if (gridToHome > 0) { addSegment('grid', 'home', gridToHome, '#3b82f6'); remainingGridImport -= gridToHome; homeLoadRemaining -= gridToHome; }
      const gridToEV = Math.min(remainingGridImport, evLoadRemaining);
      if (gridToEV > 0) { addSegment('grid', 'ev', gridToEV, '#3b82f6'); remainingGridImport -= gridToEV; evLoadRemaining -= gridToEV; }
      const gridToBattery = Math.min(remainingGridImport, batteryChargeRemaining);
      if (gridToBattery > 0) { addSegment('grid', 'battery', gridToBattery, '#3b82f6'); remainingGridImport -= gridToBattery; batteryChargeRemaining -= gridToBattery; }
    }

    setActiveSegments(segments);
  }, [telemetry, chargersPower]);

  const getFlowStyle = (power: number, normalIsPositive: boolean) => {
    // Determine speed inversely proportional to power (more power = faster)
    // Between 0.5s (max speed) and 3s (min speed)
    let speed = 3;
    if (power > 0) {
      speed = Math.max(0.5, 3 - (power / 5000) * 2.5); // Assume 5kW is max speed
    }

    // Check direction based on convention
    const direction = normalIsPositive ? 'normal' : 'reverse';

    return {
      animation: `flow ${speed}s linear infinite ${direction}`
    };
  };

  return (
    <div className="w-full flex justify-center items-center">
      <div className="relative w-full h-[460px] bg-card rounded-lg shadow overflow-hidden border">

        <style>{`
          .flow-dot {
            animation: flow linear infinite;
          }
          @keyframes flow {
            from { stroke-dashoffset: 200; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>

        {/* SVG paths for animated power flow lines */}
        <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Static Background Lines (Direct Routing) */}
          <path d="M 15 50 L 85 50" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 50 20 C 50 45, 55 45, 85 45" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 50 20 C 50 48, 45 48, 15 48" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 50 80 C 50 55, 55 55, 85 55" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 15 52 C 45 52, 45 52, 50 80" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 85 50 L 85 80" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 50 20 L 50 80" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 50 20 C 50 80, 50 80, 85 80" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 50 80 L 85 80" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />
          <path d="M 15 50 C 45 50, 45 80, 85 80" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-10" />

          {/* Active Flow lines */}
          {activeSegments.map(segment => (
            <path
              key={segment.id}
              d={segment.path}
              strokeLinecap="round"
              fill="none"
              stroke={segment.color}
              strokeWidth="6"
              strokeDasharray="0.1 200"
              className="flow-dot"
              vectorEffect="non-scaling-stroke"
              style={getFlowStyle(segment.power, segment.normalIsPositive)}
            />
          ))}
        </svg>

        {/* Grid Layout for Nodes */}
        <div className="absolute inset-0">

          {/* Grid (Left) */}
          <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: '15%', top: '50%' }}>
            <div className="z-10 flex flex-col items-center justify-center w-28 h-28 bg-card rounded-full border-[4px] border-blue-500 shadow-sm relative">
              <span className="text-xs font-medium text-muted-foreground mb-1 absolute -top-6">Grid</span>
              <ArrowRightLeft className="h-8 w-8 text-foreground mb-1" />
              <div className="text-sm font-medium flex flex-col items-center leading-tight">
                <span className="text-purple-500 text-xs">
                  &larr; {telemetry.grid_kw < 0 ? formatPowerSimple(Math.abs(telemetry.grid_kw)) : '0 W'}
                </span>
                <span className="text-blue-500 text-xs">
                  &rarr; {telemetry.grid_kw > 0 ? formatPowerSimple(telemetry.grid_kw) : '0 W'}
                </span>
              </div>
            </div>
          </div>

          {/* Battery (Bottom Center) */}
          <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '80%' }}>
            <div className="z-10 flex flex-col items-center justify-center w-28 h-28 bg-card rounded-full border-[4px] border-emerald-500 shadow-sm relative">
              <span className="text-xs font-medium text-muted-foreground mb-1 absolute -bottom-6">Battery</span>
              <Battery className="h-8 w-8 text-foreground mb-1" />
              <div className="text-sm font-medium flex flex-col items-center leading-tight">
                <span className="text-pink-500 text-xs">
                  &darr; {telemetry.battery_kw < 0 ? formatPowerSimple(Math.abs(telemetry.battery_kw)) : '0 W'}
                </span>
                <span className="text-teal-500 text-xs">
                  &uarr; {telemetry.battery_kw > 0 ? formatPowerSimple(telemetry.battery_kw) : '0 W'}
                </span>
              </div>
            </div>
          </div>

          {/* Home (Right) */}
          <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: '85%', top: '50%' }}>
            <div className="z-10 flex flex-col items-center justify-center w-28 h-28 bg-card rounded-full border-[4px] border-foreground shadow-sm relative">
              <span className="text-xs font-medium text-muted-foreground mb-1 absolute -top-6">Home</span>
              <Home className="h-8 w-8 text-foreground mb-1" />
              <div className="text-foreground text-sm font-medium">
                {formatPowerSimple(totalLoad)}
              </div>
            </div>
          </div>

          {/* Solar (Top Center) */}
          <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '20%' }}>
            <div className="z-10 flex flex-col items-center justify-center w-28 h-28 bg-card rounded-full border-[4px] border-yellow-500 shadow-sm relative">
              <span className="text-xs font-medium text-muted-foreground mb-1 absolute -top-6">Solar</span>
              <Sun className="h-8 w-8 text-foreground mb-1 relative" />
              <div className="text-foreground text-sm font-medium">
                {formatPowerSimple(telemetry.solar_kw)}
              </div>
            </div>
          </div>

          {/* EV Charger (Bottom Right) */}
          <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: '85%', top: '80%' }}>
            <div className="z-10 flex flex-col items-center justify-center w-28 h-28 bg-card rounded-full border-[4px] border-purple-500 shadow-sm relative">
              <span className="text-xs font-medium text-muted-foreground mb-1 absolute -bottom-6">EV Charger</span>
              <Zap className="h-8 w-8 text-foreground mb-1" />
              <div className="text-foreground text-sm font-medium flex flex-col items-center">
                <span>{formatPowerSimple(chargersPower)}</span>
                <span className="text-[10px] font-bold text-purple-600 uppercase mt-0.5">Active</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
