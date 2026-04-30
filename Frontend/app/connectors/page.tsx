"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnectors = async () => {
    try {
      const response = await api.get('/connectors');
      setConnectors(response.data);
    } catch (error) {
      logger.error("Failed to fetch connectors", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this connector?")) return;
    try {
      await api.delete(`/connectors/${id}`);
      setConnectors(connectors.filter(c => c.connector_id !== id));
    } catch (error) {
      logger.error("Failed to delete connector", error);
      alert("Error deleting connector.");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'available') return <Badge variant="outline" className="text-green-500 bg-green-500/10">AVAILABLE</Badge>;
    if (s === 'charging') return <Badge variant="outline" className="text-blue-500 bg-blue-500/10">CHARGING</Badge>;
    if (s === 'faulted') return <Badge variant="outline" className="text-red-500 bg-red-500/10">FAULTED</Badge>;
    return <Badge variant="outline" className="text-muted-foreground bg-muted">{status.toUpperCase()}</Badge>;
  };

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Connectors</h1>
          <p className="text-muted-foreground">Global view of all charge points and their hardware connectors.</p>
        </div>
        <Link href="/connectors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Connector
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Connector</TableHead>
              <TableHead>Charger</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Max Power</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading connectors...</TableCell>
              </TableRow>
            ) : connectors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No connectors found.</TableCell>
              </TableRow>
            ) : (
              connectors.map((conn) => (
                <TableRow key={conn.connector_id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <PlugZap className="h-4 w-4 text-muted-foreground" />
                    ID: {conn.connector_id} - {conn.connector_name}
                  </TableCell>
                  <TableCell>
                    <Link href={`/chargers/${conn.charger_id}`} className="hover:underline text-primary">
                      {conn.charger?.name || `Charger #${conn.charger_id}`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{conn.current_type}</Badge>
                  </TableCell>
                  <TableCell>{conn.max_power ? `${conn.max_power} kW` : 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(conn.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/connectors/${conn.connector_id}/edit`}>
                         <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(conn.connector_id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
