"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Zap, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";

export default function ChargersPage() {
  const [chargers, setChargers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const fetchChargers = async () => {
    try {
      const response = await api.get('/chargers');
      setChargers(response.data);
    } catch (error) {
      logger.error("Failed to fetch chargers", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChargers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this charger?")) return;
    try {
      await api.delete(`/chargers/${id}`);
      setChargers(chargers.filter(c => c.charger_id !== id));
    } catch (error) {
      logger.error("Failed to delete charger", error);
      alert("Error deleting charger.");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'online' || s === 'active') return <Badge variant="outline" className="text-green-500 bg-green-500/10">ONLINE</Badge>;
    if (s === 'charging') return <Badge variant="outline" className="text-blue-500 bg-blue-500/10">CHARGING</Badge>;
    if (s === 'faulted') return <Badge variant="outline" className="text-red-500 bg-red-500/10">FAULTED</Badge>;
    return <Badge variant="outline" className="text-muted-foreground bg-muted">OFFLINE</Badge>;
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredChargers = [...chargers]
    .filter(charger => {
      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      return (
        charger.name?.toLowerCase().includes(term) ||
        charger.manufacturer?.toLowerCase().includes(term) ||
        charger.model?.toLowerCase().includes(term) ||
        charger.chargingStation?.station_name?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;

      const { key, direction } = sortConfig;
      let aVal = a[key];
      let bVal = b[key];

      if (key === 'manufacturer_model') {
        aVal = `${a.manufacturer} ${a.model}`;
        bVal = `${b.manufacturer} ${b.model}`;
      } else if (key === 'location') {
        aVal = a.chargingStation?.station_name || 'Unassigned';
        bVal = b.chargingStation?.station_name || 'Unassigned';
      } else if (key === 'charge_group') {
        aVal = a.chargeGroup?.name || 'None';
        bVal = b.chargeGroup?.name || 'None';
      } else if (key === 'last_heartbeat') {
        aVal = a.last_heartbeat ? new Date(a.last_heartbeat).getTime() : 0;
        bVal = b.last_heartbeat ? new Date(b.last_heartbeat).getTime() : 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chargers</h1>
          <p className="text-muted-foreground">Manage OCPP charging points across all stations.</p>
        </div>
        <Link href="/chargers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Charger
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search chargers by identity, location, manufacturer or model..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Identity <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('location')}>
                <div className="flex items-center gap-1">Location <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('charge_group')}>
                <div className="flex items-center gap-1">Charge group <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('manufacturer_model')}>
                <div className="flex items-center gap-1">Manufacturer / Model <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('last_heartbeat')}>
                <div className="flex items-center gap-1">Last Heartbeat <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Loading chargers...</TableCell>
              </TableRow>
            ) : sortedAndFilteredChargers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No chargers found.</TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredChargers.map((charger) => (
                <TableRow key={charger.charger_id}>
                  <TableCell className="font-medium">
                    <Link href={`/chargers/${charger.charger_id}`} className="hover:underline flex items-center gap-2 text-primary">
                      <Zap className="h-4 w-4" />
                      {charger.name}
                    </Link>
                  </TableCell>
                  <TableCell>{charger.chargingStation?.station_name || 'Unassigned'}</TableCell>
                  <TableCell>{charger.chargeGroup?.name || 'None'}</TableCell>
                  <TableCell>{charger.manufacturer} / {charger.model}</TableCell>
                  <TableCell>{getStatusBadge(charger.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {charger.last_heartbeat 
                      ? `${formatDistanceToNow(new Date(charger.last_heartbeat))} ago` 
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    <Link href={`/chargers/${charger.charger_id}/edit`}>
                       <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(charger.charger_id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
