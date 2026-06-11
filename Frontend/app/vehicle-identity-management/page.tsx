"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface VCC {
  id: number;
  emaid: string;
  macAddress: string | null;
  status: string;
  expirationDate: string;
  userId: number;
  user: { name: string, email: string };
}

export default function VehicleIdentityManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VCC[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    emaid: "",
    macAddress: "",
    userId: user?.id || "",
  });

  const fetchVehicles = async () => {
    try {
      const response = await axios.get("/api/vehicles");
      setVehicles(response.data);
    } catch (error) {
      console.error("Failed to fetch vehicles", error);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/vehicles", {
        emaid: newVehicle.emaid,
        macAddress: newVehicle.macAddress,
        userId: Number(newVehicle.userId || user?.id),
      });
      toast({ title: "Vehicle Registered", description: "Successfully added new vehicle for Plug & Charge." });
      setIsDialogOpen(false);
      fetchVehicles();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.error || "Failed to add vehicle", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/vehicles/${id}`);
      toast({ title: "Vehicle Removed", description: "Successfully removed vehicle." });
      fetchVehicles();
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove vehicle", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Identity Management</h1>
          <p className="text-muted-foreground mt-2">Manage Plug & Charge (ISO 15118) vehicle certificates and authentication.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Register Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">EMAID</label>
                <Input required value={newVehicle.emaid} onChange={e => setNewVehicle({...newVehicle, emaid: e.target.value})} placeholder="e.g. DE*ABC*E123456789" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">MAC Address (Optional)</label>
                <Input value={newVehicle.macAddress} onChange={e => setNewVehicle({...newVehicle, macAddress: e.target.value})} placeholder="e.g. 00:1A:2B:3C:4D:5E" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">User ID</label>
                <Input type="number" required value={newVehicle.userId} onChange={e => setNewVehicle({...newVehicle, userId: e.target.value})} />
              </div>
              <Button type="submit" className="w-full">Register</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicles</CardTitle>
          <CardDescription>Vehicles authorized for automatic Plug & Charge sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EMAID</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.emaid}</TableCell>
                  <TableCell>{v.macAddress || "N/A"}</TableCell>
                  <TableCell>{v.user?.name || "Unknown"}</TableCell>
                  <TableCell>{new Date(v.expirationDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "Valid" ? "default" : "destructive"}>{v.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {vehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No vehicles registered</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
