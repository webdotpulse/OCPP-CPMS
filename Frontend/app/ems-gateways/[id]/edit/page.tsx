import { AppShell } from "@/components/layout/AppShell";
import { EmsGatewayForm } from "@/components/ems-gateways/EmsGatewayForm";
import { EmsGatewaySettings } from "@/components/ems-gateways/EmsGatewaySettings";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function EditEmsGatewayPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <AppShell>
      <div className="mb-6 space-y-4">
        <Link href="/ems-gateways">
          <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to EMS Gateways
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Gateway</h1>
          <p className="text-muted-foreground">View or edit details for EMS Gateway {resolvedParams.id}</p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Remote Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <EmsGatewayForm gatewayId={resolvedParams.id} />
        </TabsContent>
        <TabsContent value="settings">
          <EmsGatewaySettings gatewayId={resolvedParams.id} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
