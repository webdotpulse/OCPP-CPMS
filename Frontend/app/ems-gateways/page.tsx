"use client";

import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Activity } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function EmsGatewaysPage() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const response = await api.get('/ems-gateways');
        setGateways(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch EMS Gateways", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGateways();
  }, []);

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">EMS Gateways</h1>
          <p className="text-muted-foreground">Manage your Energy Management System gateways.</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <Link href="/ems-gateways/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Register Gateway
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Gateways</CardTitle>
          <CardDescription>A list of all registered NEMS gateway devices.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : gateways.length === 0 ? (
             <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No EMS Gateways registered yet.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gateway ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((gw) => (
                  <TableRow key={gw.id}>
                    <TableCell className="font-mono text-xs">{gw.gateway_id}</TableCell>
                    <TableCell>{gw.client?.email || gw.client_id}</TableCell>
                    <TableCell>
                       <Badge variant={gw.status === 'online' ? 'default' : 'secondary'}>
                          {gw.status}
                       </Badge>
                    </TableCell>
                    <TableCell>{new Date(gw.last_heartbeat).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                       <Link href={`/ems-gateways/${gw.gateway_id}/edit`}>
                         <Button variant="ghost" size="sm">Manage</Button>
                       </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
