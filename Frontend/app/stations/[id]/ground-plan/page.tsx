"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { GroundPlanBuilder } from "@/components/stations/GroundPlanBuilder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function GroundPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [station, setStation] = useState<any>(null);
  const [connectors, setConnectors] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [stationRes, chargersRes] = await Promise.all([
          api.get(`/stations/${id}`),
          api.get(`/stations/${id}/chargers`)
        ]);

        setStation(stationRes.data?.data || stationRes.data);

        // Extract all connectors from station's chargers
        const chargers = chargersRes.data?.data || chargersRes.data || [];
        const allConnectors = chargers.flatMap((c: any) =>
          c.evses?.flatMap((e: any) => e.connectors) || []
        );
        setConnectors(allConnectors);

      } catch (err) {
        console.error(err);
      }
    }
    if (id) loadData();
  }, [id]);

  if (!station) return <AppShell>Loading...</AppShell>;

  return (
    <AppShell>
      <div className="flex flex-col space-y-6 max-w-6xl mx-auto py-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ground Plan: {station.station_name}</h1>
            <p className="text-muted-foreground">Map chargers to physical parking spots.</p>
          </div>
        </div>

        <GroundPlanBuilder stationId={id} connectors={connectors} />
      </div>
    </AppShell>
  );
}
