"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash, Download, Upload, Save, Edit, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProfileItem {
  key: string;
  value: string;
}

interface ConfigProfile {
  id: number;
  name: string;
  description: string | null;
  items: ProfileItem[];
  createdAt: string;
}

export default function ConfigProfilesPage() {
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConfigProfile | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    items: [{ key: "", value: "" }],
  });

  const PERFECT_SESSION_ITEMS = [
    { key: "MeterValueSampleInterval", value: "30" },
    { key: "MeterValuesSampledData", value: "Energy.Active.Import.Register,Power.Active.Import,SoC,Current.Import,Voltage" },
    { key: "ClockAlignedDataInterval", value: "900" },
    { key: "StopTxnSampledData", value: "Energy.Active.Import.Register" },
  ];

  const fetchProfiles = async () => {
    try {
      const response = await api.get("/config-profiles");
      setProfiles(response.data || []);
    } catch (error) {
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleOpenDialog = (profile?: ConfigProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        name: profile.name,
        description: profile.description || "",
        items: profile.items.length > 0 ? profile.items.map(i => ({ key: i.key, value: i.value })) : [{ key: "", value: "" }],
      });
    } else {
      setEditingProfile(null);
      setFormData({
        name: "",
        description: "",
        items: [{ key: "", value: "" }],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        items: formData.items.filter(i => i.key.trim() !== ""),
      };

      if (editingProfile) {
        await api.put(`/config-profiles/${editingProfile.id}`, payload);
        toast.success("Profile updated");
      } else {
        await api.post("/config-profiles", payload);
        toast.success("Profile created");
      }

      setIsDialogOpen(false);
      fetchProfiles();
    } catch (error) {
      toast.error("Failed to save profile");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    try {
      await api.delete(`/config-profiles/${id}`);
      toast.success("Profile deleted");
      fetchProfiles();
    } catch (error) {
      toast.error("Failed to delete profile");
    }
  };

  const loadPreset = () => {
    setFormData({
      name: "Perfect Session preset",
      description: "Default configuration for a perfect session",
      items: [...PERFECT_SESSION_ITEMS],
    });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { key: "", value: "" }] });
  };

  const updateItem = (index: number, field: "key" | "value", val: string) => {
    const newItems = [...formData.items];
    newItems[index][field] = val;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleExport = (profile: ConfigProfile) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${profile.name.replace(/\s+/g, '_')}_profile.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.name && json.items) {
          await api.post("/config-profiles", {
            name: `${json.name} (Imported)`,
            description: json.description,
            items: json.items,
          });
          toast.success("Profile imported successfully");
          fetchProfiles();
        } else {
          toast.error("Invalid profile format");
        }
      } catch (err) {
        toast.error("Failed to parse JSON");
      }
    };
    reader.readAsText(file);
    // reset file input
    e.target.value = '';
  };


  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Configuration Profiles</h2>
            <p className="text-muted-foreground">Manage and apply OCPP configuration presets.</p>
          </div>
          <div className="flex gap-2">
            <Label htmlFor="import-profile" className="cursor-pointer">
              <div className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="w-4 h-4 mr-2" />
                Import Profile
              </div>
            </Label>
            <input
              id="import-profile"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> New Profile</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProfile ? "Edit Profile" : "Create Profile"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {!editingProfile && (
                     <div className="flex justify-end">
                       <Button variant="outline" size="sm" onClick={loadPreset}>
                         <Zap className="w-4 h-4 mr-2" /> Load Perfect Session Preset
                       </Button>
                     </div>
                  )}
                  <div className="space-y-2">
                    <Label>Profile Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Perfect Session Setup" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description..." />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Configuration Items</Label>
                      <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add Key</Button>
                    </div>
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input className="flex-1" placeholder="OCPP Key (e.g. MeterValueSampleInterval)" value={item.key} onChange={(e) => updateItem(idx, "key", e.target.value)} />
                          <Input className="flex-1" placeholder="Value (e.g. 30)" value={item.value} onChange={(e) => updateItem(idx, "value", e.target.value)} />
                          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Profile</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div>Loading profiles...</div>
        ) : profiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No configuration profiles found. Create one to easily provision chargers.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{profile.name}</CardTitle>
                      {profile.description && <CardDescription>{profile.description}</CardDescription>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    {profile.items.length} configuration keys
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog(profile)}>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport(profile)}>
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(profile.id)}>
                      <Trash className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
