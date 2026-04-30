"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface RfidTag {
  rfid_user_id: number;
  rfid_tag: string;
  name: string;
  type: string;
  active: boolean;
  createdAt: string;
}

export default function RfidPage() {
  const [tags, setTags] = useState<RfidTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTags = async () => {
    try {
      const response = await api.get('/rfid');
      setTags(response.data);
    } catch (error) {
      logger.error("Failed to fetch RFID tags", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this RFID tag? This action cannot be undone.")) return;
    try {
      await api.delete(`/rfid/${id}`);
      setTags(tags.filter(t => t.rfid_user_id !== id));
    } catch (error) {
      logger.error("Failed to delete RFID tag", error);
      alert("Error deleting tag.");
    }
  };

  const toggleActive = async (id: number) => {
    try {
      await api.patch(`/rfid/${id}/toggle`);
      setTags(tags.map(t => t.rfid_user_id === id ? { ...t, active: !t.active } : t));
    } catch (error) {
      logger.error("Failed to toggle RFID status", error);
      alert("Error updating tag status.");
    }
  };

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RFID Management</h1>
          <p className="text-muted-foreground">Manage NFC/RFID authorization whitelist and users.</p>
        </div>
        <Link href="/rfid/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Register Tag
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag ID (Hex)</TableHead>
              <TableHead>Holder Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Loading tags...</TableCell>
              </TableRow>
            ) : tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No RFID tags registered.</TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow key={tag.rfid_user_id}>
                  <TableCell className="font-mono font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/rfid/${tag.rfid_user_id}`} className="hover:underline text-primary">
                      {tag.rfid_tag}
                    </Link>
                  </TableCell>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{tag.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                       <Switch 
                         checked={tag.active}
                         onCheckedChange={() => toggleActive(tag.rfid_user_id)}
                       />
                       <span className="text-sm font-medium">{tag.active ? "Authorized" : "Blocked"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/rfid/${tag.rfid_user_id}/edit`}>
                         <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tag.rfid_user_id)} className="text-destructive hover:bg-destructive/10">
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
