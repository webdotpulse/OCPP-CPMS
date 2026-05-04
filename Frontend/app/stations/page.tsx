"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, MapPin, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Station {
  id: number;
  station_name: string;
  street_name?: string;
  city: string;
  state: string;
  postal_code?: string;
  country?: string;
  status: string;
  _count?: {
    chargers: number;
  };
  owner?: {
    id: number;
    email: string;
  };
}

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const fetchStations = async () => {
    try {
      const response = await api.get('/stations', { params: { search: searchQuery || undefined } });
      setStations(response.data?.data || response.data);
    } catch (error) {
      logger.error("Failed to fetch stations", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStations();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this station?")) return;
    try {
      await api.delete(`/stations/${id}`);
      setStations(stations.filter(s => s.id !== id));
    } catch (error) {
      logger.error("Failed to delete station", error);
      alert("Error deleting station.");
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStations = [...stations].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    let aVal: any = a[key as keyof Station];
    let bVal: any = b[key as keyof Station];

    if (key === 'location') {
      aVal = `${a.city} ${a.state}`;
      bVal = `${b.city} ${b.state}`;
    } else if (key === 'owner') {
      aVal = a.owner?.email || '';
      bVal = b.owner?.email || '';
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage physical site locations for your EV chargers.</p>
        </div>
        <Link href="/stations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Location
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search locations by name or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('station_name')}>
                <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('location')}>
                <div className="flex items-center gap-1">Location <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('country')}>
                <div className="flex items-center gap-1">Country <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('owner')}>
                <div className="flex items-center gap-1">Assigned to <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && stations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading stations...</TableCell>
              </TableRow>
            ) : sortedStations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No stations found.</TableCell>
              </TableRow>
            ) : (
              sortedStations.map((station) => (
                <TableRow key={station.id}>
                  <TableCell className="font-medium">
                    <Link href={`/stations/${station.id}`} className="hover:underline flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {station.station_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {station.street_name ? `${station.street_name}, ` : ''}
                    {station.city}, {station.state} {station.postal_code || ''}
                  </TableCell>
                  <TableCell>
                    {station.country || '—'}
                  </TableCell>
                  <TableCell>
                    {station.owner?.email || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={station.status === 'active' ? 'text-green-500 bg-green-500/10' : ''}>
                      {station.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/stations/${station.id}/edit`}>
                       <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(station.id)} className="text-destructive hover:text-destructive">
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
