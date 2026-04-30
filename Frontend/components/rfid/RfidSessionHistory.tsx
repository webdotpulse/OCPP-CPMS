"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface RfidSession {
  id: number;
  transactionId: number;
  charger: { name: string };
  connectorName: string;
  startTime: string;
  endTime?: string;
  energyConsumed: number;
  amountDue: number;
}

export function RfidSessionHistory({ rfidUserId }: { rfidUserId: number }) {
  const [sessions, setSessions] = useState<RfidSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get(`/transactions/rfid/${rfidUserId}`);
        setSessions(response.data);
      } catch (error) {
        logger.error("Failed to fetch session history", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [rfidUserId]);

  if (isLoading) {
    return <div className="text-center p-8 text-muted-foreground">Loading charging history...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
        This tag has not been used for any charging sessions yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Energy</TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell>
              <div className="font-medium text-sm">
                {new Date(session.startTime).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
              </div>
            </TableCell>
            <TableCell>
              {session.charger?.name || 'Unknown Charger'} ({session.connectorName})
            </TableCell>
            <TableCell className="text-right font-mono text-primary">
              {(session.energyConsumed / 1000).toFixed(2)} kWh
            </TableCell>
            <TableCell className="text-right font-medium">
              ${session.amountDue.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
