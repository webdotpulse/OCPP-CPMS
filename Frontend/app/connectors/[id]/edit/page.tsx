"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectorForm } from "@/components/connectors/ConnectorForm";
import { api } from "@/lib/api";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditConnectorPage() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConnector = async () => {
      try {
        const response = await api.get(`/connectors/${id}`);
        setInitialData(response.data?.data || response.data);
      } catch (error) {
        logger.error("Failed to fetch connector", error);
        alert("Failed to load connector.");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchConnector();
  }, [id]);

  return (
    <AppShell>
      <div className="mb-6 space-y-4">
        <Link href="/connectors">
          <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Connectors
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Connector</h1>
          <p className="text-muted-foreground">Update configuration for this charge point connector.</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-8">Loading...</div>
      ) : initialData ? (
        <ConnectorForm initialData={initialData} />
      ) : (
        <div className="text-red-500">Failed to load connector data.</div>
      )}
    </AppShell>
  );
}
