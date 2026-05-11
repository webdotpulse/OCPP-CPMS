"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, MapPin, Zap, Info, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { format, formatDistanceToNow } from 'date-fns';

export default function MobileChargerDetails() {
  const { id } = useParams();
  const [charger, setCharger] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharger = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/chargers/${id}`);
      setCharger(response.data);
    } catch (err) {
      logger.error("Failed to fetch charger details", err);
      setError("Failed to load charger details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCharger();
  }, [fetchCharger]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
         {/* Header */}
         <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
          <Link href="/mobile/chargers" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="ml-2 font-semibold text-lg flex-1">Loading...</div>
        </div>
        <div className="p-4 flex justify-center text-gray-500">
           Loading charger details...
        </div>
      </div>
    );
  }

  if (error || !charger) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
          <Link href="/mobile/chargers" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="ml-2 font-semibold text-lg flex-1">Error</div>
        </div>
        <div className="p-4 flex justify-center text-red-500">
           {error || "Charger not found."}
        </div>
      </div>
    );
  }

  const getDisplayStatus = (charger: any) => {
    const s = charger.status?.toLowerCase() || '';
    if (charger.active_sessions > 0) return "Charging";
    if (s === 'online' || s === 'active') return "Available";
    if (s === 'faulted') return "Faulted";
    return "Offline";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-green-500";
      case "Charging": return "bg-blue-500";
      case "Faulted": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const displayStatus = getDisplayStatus(charger);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <Link href="/mobile/chargers" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="ml-2 flex-1">
           <h1 className="font-semibold text-lg text-gray-900 truncate leading-tight">{charger.name}</h1>
           <div className="text-xs text-gray-500 font-mono">{charger.charger_id}</div>
        </div>
        <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 shrink-0">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(displayStatus)}`}></span>
          <span className="text-[10px] font-medium text-gray-700 uppercase tracking-wider">{displayStatus}</span>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Location Info */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-1.5 text-gray-500" /> Location
            </h3>
            <p className="text-sm text-gray-700">
               {charger.chargingStation?.station_name || 'Unassigned Station'}
            </p>
        </div>

         {/* Hardware Details */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-1.5 text-gray-500" /> Hardware Details
            </h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                   <p className="text-xs text-gray-500 mb-0.5">Manufacturer</p>
                   <p className="font-medium text-gray-900">{charger.manufacturer}</p>
                </div>
                 <div>
                   <p className="text-xs text-gray-500 mb-0.5">Model</p>
                   <p className="font-medium text-gray-900">{charger.model}</p>
                </div>
                 <div className="col-span-2">
                   <p className="text-xs text-gray-500 mb-0.5">Power Capacity</p>
                   <p className="font-medium text-gray-900">{charger.power_capacity} kW</p>
                </div>
            </div>
        </div>

        {/* Communications */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Info className="w-4 h-4 mr-1.5 text-gray-500" /> Communications
            </h3>
             <div className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-900">WebSocket Status</p>
                    <p className="text-xs text-gray-500">
                      {charger.status !== 'offline' ? `Connected (${charger.protocol === 'ocpp2.1' ? 'OCPP 2.1' : charger.protocol === 'ocpp2.0.1' ? 'OCPP 2.0.1' : 'OCPP 1.6J'})` : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-900">Last Heartbeat</p>
                    <p className="text-xs text-gray-500">
                      {charger.last_heartbeat
                        ? `${formatDistanceToNow(new Date(charger.last_heartbeat))} ago (${format(new Date(charger.last_heartbeat), 'HH:mm:ss')})`
                        : 'No heartbeat recorded'
                      }
                    </p>
                  </div>
                </div>
              </div>
        </div>

      </div>
    </div>
  );
}
