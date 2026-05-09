"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { simulatorApi, SimulatorConfig } from "@/lib/simulatorApi";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Power, Zap, RefreshCw } from "lucide-react";

export default function SimulatorPage() {
  const [simulators, setSimulators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newSim, setNewSim] = useState<SimulatorConfig>({
    chargerId: `Sim-${Math.floor(Math.random() * 1000)}`,
    protocol: "ocpp1.6",
    type: "AC",
    maxPowerKw: 22,
  });

  const fetchSimulators = async () => {
    try {
      const data = await simulatorApi.getSimulators();
      setSimulators(data);
    } catch {
      toast.error("Failed to load simulators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulators();
    const interval = setInterval(fetchSimulators, 3000);
    return () => clearInterval(interval);
  }, []);

  const [groupCount, setGroupCount] = useState(5);

  const handleSpawn = async () => {
    try {
      await simulatorApi.spawnSimulator(newSim);
      toast.success(`Spawned simulator ${newSim.chargerId}`);
      setNewSim({ ...newSim, chargerId: `Sim-${Math.floor(Math.random() * 1000)}` });
      fetchSimulators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to spawn simulator");
    }
  };

  const handleKill = async (chargerId: string) => {
    try {
      await simulatorApi.killSimulator(chargerId);
      toast.success(`Killed simulator ${chargerId}`);
      fetchSimulators();
    } catch {
      toast.error("Failed to kill simulator");
    }
  };

  const handleAction = async (chargerId: string, action: string, params?: any) => {
    try {
      await simulatorApi.triggerAction(chargerId, action, params);
      toast.success(`Triggered ${action} for ${chargerId}`);
      fetchSimulators();
    } catch {
      toast.error(`Failed to trigger ${action}`);
    }
  };

  const handleSpawnGroup = async () => {
    try {
      await simulatorApi.spawnSimulatorGroup(groupCount);
      toast.success(`Spawned group of ${groupCount} simulators`);
      fetchSimulators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to spawn simulator group");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Simulator</h2>
          <p className="text-muted-foreground">Manage and run OCPP simulated charge points.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Spawn New Demo Charger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="chargerId">Charger ID</Label>
                <Input
                  id="chargerId"
                  value={newSim.chargerId}
                  onChange={(e) => setNewSim({ ...newSim, chargerId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select value={newSim.protocol} onValueChange={(val: any) => setNewSim({ ...newSim, protocol: val })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocpp1.6">OCPP 1.6</SelectItem>
                    <SelectItem value="ocpp2.1">OCPP 2.1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newSim.type} onValueChange={(val: any) => setNewSim({ ...newSim, type: val })}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">AC</SelectItem>
                    <SelectItem value="DC">DC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPower">Max Power (kW)</Label>
                <Input
                  id="maxPower"
                  type="number"
                  className="w-[120px]"
                  value={newSim.maxPowerKw}
                  onChange={(e) => setNewSim({ ...newSim, maxPowerKw: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chargeProfile">Charge Profile</Label>
                <Select value={newSim.chargeProfile} onValueChange={(val: any) => setNewSim({ ...newSim, chargeProfile: val })}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SetSpeed">Set Speed</SelectItem>
                    <SelectItem value="DynamicSpeed">Dynamic Speed</SelectItem>
                    <SelectItem value="RealLife1">Real Life 1</SelectItem>
                    <SelectItem value="RealLife2">Real Life 2</SelectItem>
                    <SelectItem value="RealLifeDC1">Real Life DC 1</SelectItem>
                    <SelectItem value="RealLifeDC2">Real Life DC 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfidTags">RFID Tags (comma separated)</Label>
                <Input
                  id="rfidTags"
                  placeholder="e.g. A1B2,C3D4"
                  className="w-[200px]"
                  value={newSim.rfidTags || ""}
                  onChange={(e) => setNewSim({ ...newSim, rfidTags: e.target.value })}
                />
              </div>
              <Button onClick={handleSpawn}><Zap className="w-4 h-4 mr-2" /> Spawn Simulator</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Spawn Matrix Battery Test Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupCount">Number of Simulators</Label>
                <Input
                  id="groupCount"
                  type="number"
                  min={1}
                  max={50}
                  className="w-[120px]"
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                />
              </div>
              <Button onClick={handleSpawnGroup} variant="secondary">
                <Zap className="w-4 h-4 mr-2 text-yellow-500" /> Spawn Test Group
              </Button>
              <p className="text-sm text-muted-foreground max-w-xl">
                Automatically creates {groupCount} random simulators attached to &quot;The Matrix Battery&quot; Charge Group to test Smart Charging Load Distribution.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {simulators.map((sim) => (
            <Card key={sim.chargerId}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{sim.chargerId}</CardTitle>
                  <div className="text-sm text-muted-foreground flex gap-2 mt-1">
                    <Badge variant="outline">{sim.protocol}</Badge>
                    <Badge variant="outline">{sim.type} - {sim.maxPowerKw}kW</Badge>
                    {sim.chargeProfile && <Badge variant="outline">{sim.chargeProfile}</Badge>}
                  </div>
                </div>
                <Badge variant={sim.state === "Offline" ? "destructive" : sim.state === "Charging" ? "default" : "secondary"}>
                  {sim.state}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {sim.state === "Charging" && (
                  <div className="bg-muted p-3 rounded-md text-sm grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-xs">Transaction</span>
                      {sim.currentTransactionId}
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Energy</span>
                      {(sim.energyConsumedWh / 1000).toFixed(3)} kWh
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-semibold mb-1">Manual Controls</div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleAction(sim.chargerId, "boot")} disabled={sim.state === "Offline"}>
                      <Power className="w-4 h-4 mr-1" /> Boot
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(sim.chargerId, "startTx")} disabled={sim.state !== "Available"}>
                      <Play className="w-4 h-4 mr-1" /> Start Tx
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(sim.chargerId, "stopTx")} disabled={sim.state !== "Charging"}>
                      <Square className="w-4 h-4 mr-1" /> Stop Tx
                    </Button>
                  </div>

                  <div className="text-sm font-semibold mt-2 mb-1">Auto Simulation Loop</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction(sim.chargerId, "startAuto")}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Start Auto Loop
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleAction(sim.chargerId, "stopAuto")}>
                      Stop Loop
                    </Button>
                  </div>

                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive mt-4" onClick={() => handleKill(sim.chargerId)}>
                    Kill Simulator
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {simulators.length === 0 && !loading && (
            <div className="col-span-full text-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No active simulators. Spawn one above to get started.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
