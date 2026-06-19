"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OcpiTab } from "@/components/roaming/OcpiTab";
import { OicpTab } from "@/components/roaming/OicpTab";
import { SettlementTab } from "@/components/roaming/SettlementTab";
import { AlertCircle } from "lucide-react";

export default function RoamingPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AppShell><div className="p-8">Loading roaming settings...</div></AppShell>;

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You do not have permission to access roaming configuration.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Roaming Configuration</h1>
        <p className="text-muted-foreground">Manage OCPI and OICP endpoints for interoperability.</p>
      </div>

      <Tabs defaultValue="ocpi" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ocpi">OCPI (Open Charge Point Interface)</TabsTrigger>
          <TabsTrigger value="oicp">OICP (Hubject)</TabsTrigger>
          <TabsTrigger value="settlement">Settlement Visualizer</TabsTrigger>
        </TabsList>
        <TabsContent value="ocpi">
          <OcpiTab />
        </TabsContent>
        <TabsContent value="oicp">
          <OicpTab />
        </TabsContent>
        <TabsContent value="settlement">
          <SettlementTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
