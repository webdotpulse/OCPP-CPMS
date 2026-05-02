"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, WalletCards } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const fetchTariffs = async () => {
    try {
      const response = await api.get('/tariffs');
      setTariffs(response.data);
      setApiError(false);
    } catch (error) {
      logger.error("Failed to fetch tariffs", error);
      setApiError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tariff?")) return;
    try {
      await api.delete(`/tariffs/${id}`);
      setTariffs(tariffs.filter(t => t.tariff_id !== id));
    } catch (error) {
      logger.error("Failed to delete tariff", error);
      alert("Error deleting tariff.");
    }
  };

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tariff Management</h1>
          <p className="text-muted-foreground">Manage pricing structures for charge points.</p>
        </div>
        <Link href="/tariffs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Tariff Plan
          </Button>
        </Link>
      </div>

      {apiError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Error</AlertTitle>
          <AlertDescription>
            Could not reach the Tariff API endpoint. The backend functionality for Tariffs might not be implemented yet.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead className="text-right">Fixed Charge</TableHead>
              <TableHead className="text-right">Energy Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">Loading tariffs...</TableCell>
              </TableRow>
            ) : tariffs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {apiError ? 'Please implement the Tariff endpoints on the backend.' : 'No tariffs configured.'}
                </TableCell>
              </TableRow>
            ) : (
              tariffs.map((tariff) => (
                <TableRow key={tariff.tariff_id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <WalletCards className="h-4 w-4 text-muted-foreground" />
                    {tariff.tariff_name}
                  </TableCell>
                  <TableCell className="text-right font-mono">€{Number(tariff.charge).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">€{Number(tariff.electricity_rate).toFixed(3)} / kWh</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/tariffs/${tariff.tariff_id}/edit`}>
                         <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tariff.tariff_id)} className="text-destructive hover:bg-destructive/10">
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
