"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, MapPin, Zap, Info, Clock, CheckCircle, RefreshCw, Send, Play, Square, Settings2 } from "lucide-react";
import { MobileSpeedOverride } from "@/components/chargers/MobileSpeedOverride";
import { ConnectorList } from "@/components/chargers/ConnectorList";
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { format, formatDistanceToNow } from 'date-fns';

export default function MobileChargerDetails() {
  const { id } = useParams();
  const [charger, setCharger] = useState<any>(null);
  const [isCommandLoading, setIsCommandLoading] = useState(false);
  const [activeTxns, setActiveTxns] = useState<any[]>([]);

  const fetchActiveTxns = useCallback(async () => {
    if (!charger?.charger_id) return;
    try {
      const response = await api.get('/dashboard/live-sessions');
      const sessions = response.data.filter((s: any) => s.chargerId === charger.charger_id);
      setActiveTxns(sessions);
    } catch (err) {
      console.error(err);
    }
  }, [charger?.charger_id]);

  useEffect(() => {
    fetchActiveTxns();
    const interval = setInterval(fetchActiveTxns, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveTxns]);

  const sendCommand = async (command: string, extraData: any = {}) => {
    setIsCommandLoading(true);
    try {
      await api.post(`/ocpp/${command}`, {
        chargerId: charger.charger_id,
        ...extraData
      });
      toast.success(`${command.replace('-', ' ')} command sent`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to send ${command} command`);
    } finally {
      setIsCommandLoading(false);
    }
  };
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
        {/* OCPP Remote Controls */}
        {charger.status !== 'offline' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-1.5 text-gray-500" /> OCPP Remote Controls
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendCommand('reset', { type: 'Soft' })}
                disabled={isCommandLoading}
                className="flex items-center justify-center p-2 text-xs font-medium bg-gray-50 border rounded-lg active:bg-gray-100"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Soft Reset
              </button>
              <button
                onClick={() => sendCommand('reset', { type: 'Hard' })}
                disabled={isCommandLoading}
                className="flex items-center justify-center p-2 text-xs font-medium bg-gray-50 border rounded-lg active:bg-gray-100"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Hard Reset
              </button>
              <button
                onClick={() => sendCommand('trigger-message', { requestedMessage: 'MeterValues' })}
                disabled={isCommandLoading}
                className="flex items-center justify-center p-2 text-xs font-medium bg-gray-50 border rounded-lg active:bg-gray-100"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Trigger Msg
              </button>
              <button
                onClick={() => sendCommand('remote-start', { connectorId: 1, idTag: '12345678' })}
                disabled={isCommandLoading}
                className="flex items-center justify-center p-2 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 rounded-lg active:bg-blue-100"
              >
                <Play className="mr-1.5 h-3.5 w-3.5" /> Start
              </button>
              <button
                onClick={() => {
                   const txn = activeTxns[0];
                   if (txn) {
                     sendCommand('remote-stop', { transactionId: txn.transactionId });
                   } else {
                     toast.error('No active transaction found to stop');
                   }
                }}
                disabled={isCommandLoading}
                className="col-span-2 flex items-center justify-center p-2 text-xs font-medium bg-red-50 text-red-600 border border-red-100 rounded-lg active:bg-red-100"
              >
                <Square className="mr-1.5 h-3.5 w-3.5" /> Remote Stop
              </button>
            </div>
          </div>
        )}

        {/* Manual Speed Override */}
        {charger.status !== 'offline' && (
          <MobileSpeedOverride chargerId={charger.charger_id} currentPower={activeTxns[0]?.currentPower || 0} />
        )}

        {/* Connectors */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Settings2 className="w-4 h-4 mr-1.5 text-gray-500" /> Connectors
          </h3>
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
             <ConnectorList
               connectors={charger.evses?.flatMap((e: any) => e.connectors) || []}
               readOnly={true}
               hideLogs={true}
             />
          </div>
        </div>
      </div>
    </div>
  );
}
