"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
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

  useEffect(() => {
    // In a real implementation, this would connect to the WebSocket and filter by connectorId
    // For now, we subscribe to the existing window.location.host/api/ocpp-logs if available,
    // or simulate incoming logs based on the screenshot format.

    // Simulate initial data
    setLogs([
      {
        id: "1",
        timestamp: new Date().toISOString(),
        notification: "Ready",
        power: "",
        energy: "",
        transactionTime: "",
        card: "",
        client: ""
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        notification: "Commit transaction",
        power: "",
        energy: "27.12",
        transactionTime: "20:44",
        card: "BE-LMS-177702-0",
        client: "Urban Crop Solutions"
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 10000).toISOString(),
        notification: "Charging (full)",
        power: "0.00",
        energy: "27.12",
        transactionTime: "20:44",
        card: "BE-LMS-177702-0",
        client: "Urban Crop Solutions"
      }
    ]);

    // Set up WebSocket connection for real logs
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ocpp-logs`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'log' && data.log.chargerId === chargerId) {
             const message = typeof data.log.message === 'string' ? JSON.parse(data.log.message) : data.log.message;

             // Very basic filtering - check if the payload has our connectorId
             const payload = message[3] || {};
             if (payload.connectorId && payload.connectorId !== connectorId) {
               return; // Skip logs for other connectors
             }

             const action = message[2];

             const newLog: ChannelLog = {
               id: data.log.id.toString(),
               timestamp: data.log.timestamp,
               notification: action || "Unknown",
               power: payload.meterValue?.[0]?.sampledValue?.find((v:any) => v.measurand === 'Power.Active.Import')?.value || "",
               energy: payload.meterValue?.[0]?.sampledValue?.find((v:any) => v.measurand === 'Energy.Active.Import.Register')?.value || payload.meterStop || payload.meterStart || "",
               transactionTime: "",
               card: payload.idTag || "",
               client: ""
             };

             setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50
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
            <TableRow key={log.id} className="h-10">
              <TableCell className="py-1">{format(new Date(log.timestamp), 'dd-MMM-yyyy HH:mm:ss')}</TableCell>
              <TableCell className="py-1">
                {log.notification}
              </TableCell>
              <TableCell className="py-1">{log.power}</TableCell>
              <TableCell className="py-1">{log.energy}</TableCell>
              <TableCell className="py-1">{log.transactionTime}</TableCell>
              <TableCell className="py-1">
                {log.card && <span className="text-blue-500 hover:underline cursor-pointer">{log.card}</span>}
              </TableCell>
              <TableCell className="py-1 text-blue-500 hover:underline cursor-pointer">
                {log.client}
              </TableCell>
            </TableRow>
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
