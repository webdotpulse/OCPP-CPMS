"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

interface Connector {
  connector_id: number;
  connector_name: string;
  status: string;
  current_type: string;
  max_power: number;
  max_current?: number;
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
            <TableHead>Connector</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Power</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connectors.map((conn) => (
            <TableRow key={conn.connector_id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {getStatusIcon(conn.status)}
                  <span>{conn.connector_name || `Connector ${conn.connector_id}`}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{conn.current_type || 'N/A'}</Badge>
              </TableCell>
              <TableCell>{conn.max_power ? `${conn.max_power} kW` : 'N/A'}</TableCell>
              <TableCell>{conn.max_current ? `${conn.max_current} A` : 'N/A'}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(conn.status)}>
                  {conn.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
