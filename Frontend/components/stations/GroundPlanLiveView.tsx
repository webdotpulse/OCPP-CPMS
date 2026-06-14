"use client";

import React, { useEffect, useState } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { api } from "@/lib/api";
import { Zap, BatteryCharging, AlertTriangle, User, Power } from "lucide-react";
import { motion } from "framer-motion";

interface ParkingSpot {
  id: number;
  stationId: number;
  name: string;
  type?: string;
  fillColor?: string;
  lineColor?: string;
  lineWidth?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  connectorId?: string;
  connector?: any;
}

export function GroundPlanLiveView({ stationId }: { stationId: string }) {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { sessions, chargers, fetchSessions, fetchChargers } = useTelemetryStore();

  useEffect(() => {
    // Initial fetch
    fetchSessions();
    fetchChargers();

    async function loadPlan() {
      try {
        const res = await api.get(`/stations/${stationId}/parking-spots`);
        setSpots(res.data);
      } catch (err) {
        console.error("Failed to load parking spots", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlan();
  }, [stationId, fetchSessions, fetchChargers]);

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading Live View...</div>;

  return (
    <div className="relative w-full h-[700px] bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 0)', backgroundSize: '10px 10px' }}>
      {spots.map((spot) => {
        if (spot.type === "rectangle" || spot.type === "line") {
          return (
            <motion.div
              key={spot.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                position: "absolute",
                left: spot.x,
                top: spot.y,
                width: spot.width,
                height: spot.type === "line" ? (spot.lineWidth || 4) : spot.height,
                transform: `rotate(${spot.rotation}deg)`,
                ...(spot.type === "rectangle" ? {
                  backgroundColor: spot.fillColor || "transparent",
                  borderColor: spot.lineColor || "#0f172a",
                  borderWidth: `${spot.lineWidth || 2}px`,
                  borderStyle: "solid"
                } : spot.type === "line" ? {
                  backgroundColor: spot.lineColor || "#0f172a",
                } : {})
              }}
              className="rounded flex flex-col items-center justify-center pointer-events-none"
            >
              {spot.name && spot.type === "rectangle" && (
                <span className="text-slate-900 font-bold text-center text-sm px-2 py-1 bg-white/70 rounded backdrop-blur-sm shadow-sm">{spot.name}</span>
              )}
            </motion.div>
          );
        }

        // Find matching active session for the connected socket
        const activeSession = sessions.find(s =>
          spot.connector &&
          s.chargerName === spot.connector?.evse?.charger?.name &&
          s.connectorName === spot.connector?.connector_name
        );

        // Find charger status
        const chargerStatus = spot.connector ?
           chargers.find(c => c.name === spot.connector?.evse?.charger?.name) : null;

        let state: "empty" | "idle" | "charging" | "faulted" = "empty";
        if (spot.connector) {
           if (chargerStatus?.status === "Faulted") state = "faulted";
           else if (activeSession) state = "charging";
           else state = "idle";
        }

        return (
          <motion.div
            key={spot.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "absolute",
              left: spot.x,
              top: spot.y,
              width: spot.width,
              height: spot.height,
              transform: `rotate(${spot.rotation}deg)`,
            }}
            className={`
              rounded-xl border-2 backdrop-blur-sm shadow-lg flex flex-col items-center justify-center p-3 transition-all duration-500
              ${state === "empty" ? "border-slate-300 bg-white/60 border-dashed" : ""}
              ${state === "idle" ? "border-sky-400 bg-sky-50 shadow-[0_0_10px_rgba(56,189,248,0.2)]" : ""}
              ${state === "charging" ? "border-emerald-500 bg-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : ""}
              ${state === "faulted" ? "border-red-500 bg-red-50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : ""}
            `}
          >
            {/* Spot Label */}
            <div className="absolute top-2 left-0 right-0 text-center text-xs font-bold text-slate-900">
              {spot.name}
            </div>

            {/* Empty State */}
            {state === "empty" && (
              <div className="text-slate-500 text-xs text-center mt-4">
                No Socket Assigned
              </div>
            )}

            {/* Idle State */}
            {state === "idle" && (
              <div className="flex flex-col items-center mt-4 text-sky-600">
                <Zap className="h-8 w-8 mb-1 opacity-80" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Available</span>
                <span className="text-xs text-sky-700/70 truncate max-w-full px-1">{spot.connector?.evse?.charger?.name}</span>
              </div>
            )}

            {/* Faulted State */}
            {state === "faulted" && (
              <div className="flex flex-col items-center mt-4 text-red-600 animate-pulse">
                <AlertTriangle className="h-8 w-8 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Unavailable</span>
              </div>
            )}

            {/* Charging State (Live Telemetry) */}
            {state === "charging" && activeSession && (
              <div className="flex flex-col items-center mt-2 w-full">
                 <motion.div
                   animate={{ opacity: [0.5, 1, 0.5] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="text-emerald-600 mb-2"
                 >
                   <BatteryCharging className="h-8 w-8" />
                 </motion.div>

                 <div className="w-full bg-white/80 rounded-lg p-2 flex flex-col space-y-1 border border-emerald-200 shadow-sm">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 flex items-center"><Power className="h-3 w-3 mr-1"/>Power</span>
                      <span className="font-mono text-emerald-700 font-bold">{(activeSession.currentPower || 0).toFixed(1)} kW</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 flex items-center"><Zap className="h-3 w-3 mr-1"/>Energy</span>
                      <span className="font-mono text-emerald-700 font-bold">{(activeSession.energyConsumed || 0).toFixed(2)} kWh</span>
                    </div>
                 </div>

                 <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-100 px-2 py-1 rounded-full flex items-center max-w-full truncate shadow-sm">
                    <User className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate">{(activeSession as any).idTag || "RFID Session Active"}</span>
                 </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
