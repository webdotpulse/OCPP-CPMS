"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CreateChargeGroupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [allChargers, setAllChargers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allTariffs, setAllTariffs] = useState<any[]>([]);

  const [selectedChargers, setSelectedChargers] = useState<number[]>([]);
  const [groupUsers, setGroupUsers] = useState<{userId: number, tariffId: number | null}[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/chargers'),
      api.get('/users'),
      api.get('/tariffs')
    ]).then(([chargersRes, usersRes, tariffsRes]) => {
      setAllChargers(chargersRes.data.data || chargersRes.data);
      setAllUsers(usersRes.data);
      setAllTariffs(tariffsRes.data);
    }).catch(err => {
      console.error(err);
      toast.error("Failed to load dependency data");
    });
  }, []);

  const toggleCharger = (id: number) => {
    setSelectedChargers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleUser = (userId: number) => {
    setGroupUsers(prev => {
      if (prev.some(u => u.userId === userId)) {
        return prev.filter(u => u.userId !== userId);
      } else {
        return [...prev, { userId, tariffId: null }];
      }
    });
  };

  const updateUserTariff = (userId: number, tariffId: number | null) => {
    setGroupUsers(prev => prev.map(u => u.userId === userId ? { ...u, tariffId } : u));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("Name is required");

    setIsLoading(true);
    try {
      await api.post('/charge-groups', {
        name,
        description,
        chargerIds: selectedChargers,
        users: groupUsers
      });
      toast.success("Charge group created");
      router.push('/charge-groups');
    } catch {
      toast.error("Failed to create charge group");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create Charge Group</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Group Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Employee Parking A" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Optional details..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Assign Chargers</CardTitle></CardHeader>
              <CardContent className="max-h-64 overflow-y-auto space-y-2">
                {allChargers.map(charger => (
                  <div key={charger.charger_id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleCharger(charger.charger_id)}>
                    <Checkbox checked={selectedChargers.includes(charger.charger_id)} />
                    <Label className="cursor-pointer">{charger.name} <span className="text-muted-foreground text-xs">({charger.model})</span></Label>
                  </div>
                ))}
                {allChargers.length === 0 && <p className="text-muted-foreground text-sm">No chargers found.</p>}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="h-full">
              <CardHeader><CardTitle>Assign Users & Tariffs</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {allUsers.map(u => {
                  const isSelected = groupUsers.some(gu => gu.userId === u.id);
                  const selectedTariff = groupUsers.find(gu => gu.userId === u.id)?.tariffId;

                  return (
                    <div key={u.id} className={`p-4 border rounded space-y-3 ${isSelected ? 'bg-primary/5 border-primary/20' : ''}`}>
                      <div className="flex items-center space-x-2 cursor-pointer" onClick={() => toggleUser(u.id)}>
                        <Checkbox checked={isSelected} />
                        <div>
                          <Label className="cursor-pointer font-medium">{u.email}</Label>
                          <p className="text-xs text-muted-foreground">{u.userType} - {u.companyName || 'No company'}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="pl-6 pt-2">
                          <Label className="text-xs mb-1 block">Specific Tariff for this user in this group</Label>
                          <Select
                            value={selectedTariff ? selectedTariff.toString() : "none"}
                            onValueChange={(val) => updateUserTariff(u.id, val === "none" ? null : parseInt(val))}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select a tariff" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Default / No Tariff</SelectItem>
                              {allTariffs.map(t => (
                                <SelectItem key={t.tariff_id} value={t.tariff_id.toString()}>
                                  {t.tariff_name} (${t.charge})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Charge Group
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
