"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ChannelLog {
  id: string;
  timestamp: string;
  notification: string;
  power: string;
  energy: string;
  transactionTime: string;
  card: string;
  client: string;
  type?: string;
  details?: any;
}

interface ChannelLogsProps {
  chargerId: number;
  connectorId: number;
}

export function ChannelLogs({ chargerId, connectorId }: ChannelLogsProps) {
  const [logs, setLogs] = useState<ChannelLog[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const parseLogPayload = (data: any): ChannelLog | null => {
      try {
        let parsedMsg: any = null;
        if (typeof data.message === 'string') {
          parsedMsg = JSON.parse(data.message);
        } else {
          parsedMsg = data.message;
        }

        let action = '-';
        let payload: any = parsedMsg;

        if (Array.isArray(parsedMsg)) {
          const typeId = parsedMsg[0];
          if (typeId === 2) {
            action = parsedMsg[2];
            payload = parsedMsg[3];
          } else if (typeId === 3) {
            action = 'Response';
            payload = parsedMsg[2];
          } else if (typeId === 4) {
            action = 'Error';
            payload = parsedMsg.slice(2);
          }
        } else if (parsedMsg && typeof parsedMsg === 'object') {
          if (data.direction === 'in') {
            action = 'Request';
            if (parsedMsg.chargePointVendor) action = 'BootNotification';
            else if (parsedMsg.meterStart !== undefined || (parsedMsg.idTag && parsedMsg.connectorId)) action = 'StartTransaction';
            else if (parsedMsg.meterStop !== undefined) action = 'StopTransaction';
            else if (parsedMsg.meterValue) action = 'MeterValues';
            else if (parsedMsg.status && parsedMsg.errorCode) action = 'StatusNotification';
            else if (parsedMsg.idTag) action = 'Authorize';
          } else {
            action = 'Response';
          }
          payload = parsedMsg;
        }

        if (payload?.connectorId !== undefined && payload.connectorId !== connectorId) {
          return null;
        }

        return {
          id: data.id?.toString() || Math.random().toString(36).substring(7),
          timestamp: data.timestamp,
          notification: typeof action === 'string' ? action : "Response",
          power: payload?.meterValue?.[0]?.sampledValue?.find((v:any) => v.measurand === 'Power.Active.Import')?.value || "",
          energy: payload?.meterValue?.[0]?.sampledValue?.find((v:any) => v.measurand === 'Energy.Active.Import.Register')?.value || payload?.meterStop || payload?.meterStart || "",
          transactionTime: "",
          card: payload?.idTag || "",
          client: "",
          type: action,
          details: payload
        };
      } catch {
        return null;
      }
    };

    const fetchHistoricalLogs = async () => {
      try {
        const response = await api.get(`/chargers/${chargerId}/logs`);
        const historicalLogs = (response.data || [])
          .map(parseLogPayload)
          .filter(Boolean) as ChannelLog[];
        setLogs(historicalLogs.slice(0, 50));
      } catch (error) {
        console.error("Failed to fetch historical logs", error);
      }
    };

    fetchHistoricalLogs();

    // Set up WebSocket connection for live logs
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ocpp-logs`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'log' && data.log.chargerId === chargerId) {
             const newLog = parseLogPayload(data.log);
             if (newLog) {
               setLogs(prev => [newLog, ...prev].slice(0, 50));
             }
          }
        } catch {
          // parse error
        }
      };
    } catch (err) {
      console.error("Failed to connect to OCPP logs WS", err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [chargerId, connectorId]);

  return (
    <div className="mt-4 border rounded-md">
      <div className="bg-muted px-4 py-2 flex gap-4 text-sm border-b overflow-x-auto whitespace-nowrap">
        <span>Channel {connectorId}&apos;s log:</span>
        <button className="text-primary hover:underline">⇒Show detailed log items</button>
        <button className="text-primary hover:underline">⇒Show logged values</button>
        <button className="text-primary hover:underline">⇒Show more</button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Date</TableHead>
            <TableHead>Notification</TableHead>
            <TableHead>Power (kW)</TableHead>
            <TableHead>Energy (kWh)</TableHead>
            <TableHead>Transaction time</TableHead>
            <TableHead>Card</TableHead>
            <TableHead>Client</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <React.Fragment key={log.id}>
              <TableRow
                className="h-10 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleRow(log.id)}
              >
                <TableCell className="py-1">{format(new Date(log.timestamp), 'dd-MMM-yyyy HH:mm:ss')}</TableCell>
                <TableCell className="py-1">
                  {log.notification}
                </TableCell>
                <TableCell className="py-1">{log.power}</TableCell>
                <TableCell className="py-1">{log.energy}</TableCell>
                <TableCell className="py-1">{log.transactionTime}</TableCell>
                <TableCell className="py-1">
                  {log.card && <span className="text-blue-500 hover:underline">{log.card}</span>}
                </TableCell>
                <TableCell className="py-1 text-blue-500 hover:underline">
                  {log.client}
                </TableCell>
              </TableRow>
              {expandedRowIds.has(log.id) && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0 border-b">
                    <div className="bg-muted/30 p-4 font-mono text-xs whitespace-pre-wrap break-words break-all text-zinc-600 dark:text-zinc-400">
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                No logs available for this channel
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
