"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit, Zap, Info, Clock, CheckCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { RemoteControlPanel } from "@/components/chargers/RemoteControlPanel";
import { ConnectorList } from "@/components/chargers/ConnectorList";

interface ChargerDetail {
  charger_id: number;
  name: string;
  model: string;
  manufacturer: string;
  serial_number: string;
  status: string;
  firmware_version: string;
  power_capacity: number;
  last_heartbeat: string;
  chargingStation?: {
    station_name: string;
    city: string;
    state: string;
  };
  connectors: any[];
}

export default function ChargerDetailPage() {
  const { id } = useParams();
  const [charger, setCharger] = useState<ChargerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCharger = async () => {
      try {
        const response = await api.get(`/chargers/${id}`);
        setCharger(response.data);
      } catch (error) {
        logger.error("Failed to fetch charger details", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchCharger();
  }, [id]);

  if (isLoading) return <AppShell><div className="p-8">Loading charger details...</div></AppShell>;
  if (!charger) return <AppShell><div className="p-8 text-red-500">Charger not found</div></AppShell>;

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'online' || s === 'active') return <Badge className="text-green-500 bg-green-500/10 border-green-500/20">ONLINE</Badge>;
    if (s === 'charging') return <Badge className="text-blue-500 bg-blue-500/10 border-blue-500/20">CHARGING</Badge>;
    if (s === 'faulted') return <Badge className="text-red-500 bg-red-500/10 border-red-500/20">FAULTED</Badge>;
    return <Badge variant="secondary">OFFLINE</Badge>;
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-4">
          <Link href="/chargers">
            <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to Chargers
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{charger.name}</h1>
            {getStatusBadge(charger.status)}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            Installed at {charger.chargingStation ? (
              <span className="font-medium text-foreground">{charger.chargingStation.station_name}</span>
            ) : (
              <i>Unassigned Station</i>
            )}
          </p>
        </div>
        <Link href={`/chargers/${id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" /> Edit Configuration
          </Button>
        </Link>
      </div>

      {/* Top Priority Section: Remote Controls */}
      <div className="mb-6">
        {charger.status !== 'offline' ? (
          <RemoteControlPanel chargerId={charger.charger_id} />
        ) : (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6 space-y-4">
              <Info className="h-10 w-10 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-lg">Charger is Offline</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  OCPP remote controls are disabled because the charger is not currently connected to the server.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Secondary Section: Hardware and Communications (Single Line) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Hardware Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Manufacturer / Model</p>
                <p className="font-medium">{charger.manufacturer} {charger.model}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <p className="font-medium font-mono text-sm">{charger.serial_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Firmware Version</p>
                <p className="font-medium">{charger.firmware_version}</p>
              </div>
              <div className="space-y-1 flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Power Capacity</p>
                  <p className="font-medium">{charger.power_capacity} kW</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
              <div>
                <p className="font-medium text-sm">WebSocket Status</p>
                <p className="text-xs text-muted-foreground">
                  {charger.status !== 'offline' ? 'Connected (OCPP 1.6J)' : 'Disconnected'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="font-medium text-sm">Last Heartbeat</p>
                <p className="text-xs text-muted-foreground">
                  {charger.last_heartbeat 
                    ? `${formatDistanceToNow(new Date(charger.last_heartbeat))} ago (${format(new Date(charger.last_heartbeat), 'HH:mm:ss')})`
                    : 'System has no recorded heartbeat'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tertiary Section: Connectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Connectors</CardTitle>
              <CardDescription>Physical charge points on this hardware</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ConnectorList connectors={charger.connectors} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
