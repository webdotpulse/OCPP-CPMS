"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ActiveSession {
  transactionId: number;
  chargerName: string;
  connectorName: string;
  startTime: string;
  energyConsumed: number;
  status: string;
}

export function LiveSessionsTable() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.get('/dashboard/live-sessions');
        setSessions(response.data);
      } catch (error) {
        logger.error('Failed to fetch live sessions', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Charging Sessions</CardTitle>
            <CardDescription>
              Currently active transaction updates
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8 text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="flex justify-center p-8 text-muted-foreground border border-dashed rounded-lg">
            No active sessions currently.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Txn ID</TableHead>
                <TableHead>Charger</TableHead>
                <TableHead>Connector</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Generated Energy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.transactionId}>
                  <TableCell className="font-medium">#{session.transactionId}</TableCell>
                  <TableCell>{session.chargerName}</TableCell>
                  <TableCell>{session.connectorName}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-primary">
                    {session.energyConsumed > 0 ? `${(session.energyConsumed / 1000).toFixed(2)} kWh` : 'Starting...'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
