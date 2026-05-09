"use client";
import React from "react";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { ChannelLogs } from "./ChannelLogs";
import { toast } from "sonner";

interface Connector {
  connector_id: number;
  connector_name: string;
  status: string;
  current_type: string;
  max_power: number;
  max_current?: number;
  charger_id?: number;
}

interface ConnectorListProps {
  connectors: Connector[];
}

function getStatusIcon(status: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'available') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === 'charging') return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />;
  if (s === 'faulted') return <AlertTriangle className="h-4 w-4 text-red-500" />;
  return <XCircle className="h-4 w-4 text-muted-foreground" />;
}

function getStatusColor(status: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'available') return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (s === 'charging') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  if (s === 'faulted') return 'bg-red-500/10 text-red-500 border-red-500/20';
  if (s === 'reserved') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if (s === 'unavailable') return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  return 'bg-muted text-muted-foreground';
}

export function ConnectorList({ connectors }: ConnectorListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTxns, setActiveTxns] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const chargerId = connectors[0]?.charger_id;
    if (!chargerId) return;

    const fetchActiveTxns = async () => {
      try {
        const { api } = await import('@/lib/api');
        const response = await api.get(`/transactions/charger/${chargerId}`);
        const payload = response.data;
        let allTxns: any[] = [];
        if (payload && payload.data) {
          const basicTxns = Array.isArray(payload.data.transactions) ? payload.data.transactions : [];
          const rfidTxns = Array.isArray(payload.data.rfidSessions) ? payload.data.rfidSessions : [];
          const basicTxnIds = new Set(basicTxns.map((t: any) => t.transactionId));
          const uniqueRfidTxns = rfidTxns.filter((s: any) => !basicTxnIds.has(s.transactionId));
          allTxns = [...basicTxns, ...uniqueRfidTxns];
        } else if (payload && (payload.transactions || payload.rfidSessions)) {
          const basicTxns = Array.isArray(payload.transactions) ? payload.transactions : [];
          const rfidTxns = Array.isArray(payload.rfidSessions) ? payload.rfidSessions : [];
          const basicTxnIds = new Set(basicTxns.map((t: any) => t.transactionId));
          const uniqueRfidTxns = rfidTxns.filter((s: any) => !basicTxnIds.has(s.transactionId));
          allTxns = [...basicTxns, ...uniqueRfidTxns];
        }

        setActiveTxns(allTxns.filter(t => t.status === 'charging' || t.status === 'Preparing' || t.endTime === null));
      } catch {
        // silently fail
      }
    };

    fetchActiveTxns();
    const interval = setInterval(fetchActiveTxns, 3000);
    return () => clearInterval(interval);
  }, [connectors]);

  const formatDuration = (start: string | Date) => {
    if (!start) return '00:00:00';
    const diff = now - new Date(start).getTime();
    if (diff < 0) return '00:00:00';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!connectors || connectors.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg flex flex-col items-center gap-2">
        <Clock className="h-8 w-8 text-muted-foreground/50" />
        <p>No connectors configured for this charger.</p>
        <p className="text-xs">Connectors will be auto-created when the charger connects.</p>
      </div>
    );
  }

  const availableCount = connectors.filter(c => c.status?.toLowerCase() === 'available').length;
  const chargingCount = connectors.filter(c => c.status?.toLowerCase() === 'charging').length;
  const faultedCount = connectors.filter(c => c.status?.toLowerCase() === 'faulted').length;

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleDevAnalyzeSession = async (chargerId: number, connectorId: number | string) => {
    try {
      const { api } = await import('@/lib/api');
      const response = await api.get(`/chargers/${chargerId}/logs?limit=50`);
      const logs = response.data || [];

      const connectorLogs = logs.filter((log: any) =>
        log.action === 'MeterValues' &&
        log.payload?.meterValue?.[0]?.sampledValue &&
        (log.payload.connectorId === Number(connectorId) || !log.payload.connectorId)
      );

      if (connectorLogs.length === 0) {
        toast.error("Analysis Result: No recent MeterValues found for this connector.");
        return;
      }

      let hasPower = false;
      let hasEnergy = false;

      for (const log of connectorLogs) {
        const values = log.payload.meterValue[0].sampledValue;
        for (const val of values) {
          if (val.measurand === 'Power.Active.Import') hasPower = true;
          if (val.measurand === 'Energy.Active.Import.Register') hasEnergy = true;
        }
      }

      if (!hasPower && !hasEnergy) {
        toast.warning("Analysis Result: Charger is sending MeterValues, but missing both Power and Energy measurands. Apply a standard Config Profile.");
      } else if (!hasPower) {
        toast.warning("Analysis Result: Missing Power.Active.Import measurand. Apply Config Profile.");
      } else if (!hasEnergy) {
        toast.warning("Analysis Result: Missing Energy.Active.Import.Register measurand. Apply Config Profile.");
      } else {
        toast.success("Analysis Result: Both Power and Energy measurands are present. The UI should be updating.");
      }
    } catch (error) {
      toast.error("Failed to fetch logs for analysis.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          {availableCount} Available
        </Badge>
        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          {chargingCount} Charging
        </Badge>
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          {faultedCount} Faulted
        </Badge>
        <Badge variant="outline">
          {connectors.length} Total
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Connector</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Power</TableHead>
            <TableHead>Energy</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connectors.map((conn) => (
            <React.Fragment key={conn.connector_id}>
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(conn.connector_id)}
              >
                <TableCell>
                  {expandedId === conn.connector_id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(conn.status)}
                    <span>{conn.connector_name || `Connector ${conn.connector_id}`}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{conn.current_type || 'N/A'}</Badge>
                </TableCell>
                {(() => {
                  const activeTxn = activeTxns.find(t => t.connectorName === String(conn.connector_id) || t.connectorName === conn.connector_name);
                  const isCharging = conn.status?.toLowerCase() === 'charging' || activeTxn;

                  if (isCharging && activeTxn) {
                    const power = activeTxn.currentPower ? (activeTxn.currentPower / 1000).toFixed(2) + ' kW' : '0.00 kW';
                    const energy = activeTxn.energyConsumed ? (activeTxn.energyConsumed / 1000).toFixed(2) + ' kWh' : '0.00 kWh';
                    const duration = formatDuration(activeTxn.startTime || activeTxn.createdAt);
                    return (
                      <>
                        <TableCell className="font-mono text-primary">{power}</TableCell>
                        <TableCell className="font-mono text-primary">{energy}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{duration}</TableCell>
                      </>
                    );
                  }

                  return (
                    <>
                      <TableCell className="text-muted-foreground">N/A</TableCell>
                      <TableCell className="text-muted-foreground">N/A</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                    </>
                  );
                })()}
                <TableCell>
                  <div className="flex flex-col gap-2 items-start">
                    <Badge className={getStatusColor(conn.status)}>
                      {conn.status}
                    </Badge>
                    {(() => {
                      const activeTxn = activeTxns.find(t => t.connectorName === String(conn.connector_id) || t.connectorName === conn.connector_name);
                      const isCharging = conn.status?.toLowerCase() === 'charging' || activeTxn;
                      if (isCharging && activeTxn && !activeTxn.currentPower && !activeTxn.energyConsumed) {
                        return (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 text-[10px] px-2 py-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDevAnalyzeSession(conn.charger_id || 0, conn.connector_id);
                            }}
                          >
                            DEV: Analyze Session
                          </Button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </TableCell>
              </TableRow>
              {expandedId === conn.connector_id && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0 border-b-0 bg-muted/10">
                    <div className="p-4 pt-0">
                      <ChannelLogs
                        chargerId={conn.charger_id || 0}
                        connectorId={conn.connector_id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
