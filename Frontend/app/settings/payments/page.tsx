"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentsSettingsPage() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [profileId, setProfileId] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "superadmin") return;

    const fetchConfig = async () => {
      try {
        const response = await api.get("/settings/payments/mollie");
        if (response.data && response.data.data) {
          const config = response.data.data;
          setHasApiKey(config.hasApiKey);
          setProfileId(config.profileId || "");
          setTestMode(config.testMode);
        }
      } catch (error) {
        console.error("Failed to fetch Mollie config:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post("/settings/payments/mollie", { apiKey, profileId, testMode });
      toast.success("Mollie configuration updated successfully");
      if (apiKey) setHasApiKey(true);
      setApiKey(""); // Clear it from state since it shouldn't be exposed
    } catch (error) {
      console.error("Failed to update config:", error);
      toast.error("Failed to update Mollie configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (user?.role !== "admin" && user?.role !== "superadmin") {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Payment Configuration</h1>
        <p className="text-muted-foreground">
          Configure API keys and settings for Mollie payments.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Mollie Integration</CardTitle>
            </div>
            <CardDescription>
              Provide your Mollie API Key to process ad-hoc and subscription payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading settings...</span>
              </div>
            ) : (
              <>
                {hasApiKey && !apiKey && (
                  <Alert className="bg-muted">
                    <AlertDescription>
                      An API key is currently saved. Entering a new key below will overwrite it.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Mollie API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder={hasApiKey ? "••••••••••••••••" : "Enter Mollie API Key (e.g., test_... or live_...)"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileId">Profile ID (Optional)</Label>
                  <Input
                    id="profileId"
                    type="text"
                    placeholder="pfl_..."
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Required for certain types of onboarding or routing.</p>
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="testMode">Test Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use test API keys and sandbox environments.
                    </p>
                  </div>
                  <Switch
                    id="testMode"
                    checked={testMode}
                    onCheckedChange={setTestMode}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isLoading || isSaving || (!hasApiKey && !apiKey)}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
