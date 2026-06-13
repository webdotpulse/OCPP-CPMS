"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const settingsSchema = z.object({
  maxGridImport: z.number().min(0, "Must be positive"),
  maxGridExport: z.number().min(0, "Must be positive"),
  strategy: z.string().min(1, "Strategy is required"),
  v2gEnabled: z.boolean(),
  batteryReserveLimit: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
  autoUpdate: z.boolean(),
});

type EmsSettingsFormValues = z.infer<typeof settingsSchema>;

interface EmsGatewaySettingsProps {
  gatewayId: string;
}

export function EmsGatewaySettings({ gatewayId }: EmsGatewaySettingsProps) {
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<EmsSettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      maxGridImport: 0,
      maxGridExport: 0,
      strategy: "self-consumption",
      v2gEnabled: false,
      batteryReserveLimit: 20,
      autoUpdate: true,
    }
  });

  useEffect(() => {
    if (gatewayId) {
      const fetchGateway = async () => {
        setIsFetching(true);
        try {
          const res = await api.get('/ems-gateways');
          const gatewaysArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const gateway = gatewaysArray.find((g: any) => g.gateway_id === gatewayId);
          if (gateway) {
            reset({
              maxGridImport: gateway.maxGridImport ?? 0,
              maxGridExport: gateway.maxGridExport ?? 0,
              strategy: gateway.strategy ?? "self-consumption",
              v2gEnabled: gateway.v2gEnabled ?? false,
              batteryReserveLimit: gateway.batteryReserveLimit ?? 20,
              autoUpdate: gateway.autoUpdate ?? true,
            });
          } else {
             toast.error("Gateway not found.");
          }
        } catch (error) {
          console.error("Failed to fetch gateway details", error);
          toast.error("Failed to fetch gateway details.");
        } finally {
          setIsFetching(false);
        }
      };
      fetchGateway();
    }
  }, [gatewayId, reset]);

  const onSubmit = async (data: EmsSettingsFormValues) => {
    setIsLoading(true);
    try {
      if (user?.role === 'admin' || user) {
        await api.patch(`/ems-gateways/${gatewayId}/settings`, data);
        toast.success("Settings updated successfully and pushed to device.");
        router.refresh();
      }
    } catch (error: any) {
      console.error("Failed to update EMS settings", error);
      toast.error(error.response?.data?.error || "Failed to update settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <Card className="w-full max-w-2xl shadow-sm">
        <CardContent className="flex justify-center p-8">
           <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl shadow-sm">
      <CardHeader className="border-b pb-4">
        <CardTitle>Remote Configuration</CardTitle>
        <CardDescription>Configure the operation settings of your NEMS device remotely.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxGridImport">Max Grid Import (kW)</Label>
              <Input
                type="number"
                step="0.1"
                {...register("maxGridImport", { valueAsNumber: true })}
              />
              {errors.maxGridImport && <p className="text-sm text-destructive">{errors.maxGridImport.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxGridExport">Max Grid Export (kW)</Label>
              <Input
                type="number"
                step="0.1"
                {...register("maxGridExport", { valueAsNumber: true })}
              />
              {errors.maxGridExport && <p className="text-sm text-destructive">{errors.maxGridExport.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy">Operational Strategy</Label>
            <Select
              value={watch("strategy")}
              onValueChange={(val) => setValue("strategy", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self-consumption">Self Consumption</SelectItem>
                <SelectItem value="peak-shaving">Peak Shaving</SelectItem>
                <SelectItem value="arbitrage">Energy Arbitrage</SelectItem>
                <SelectItem value="backup">Backup Power</SelectItem>
              </SelectContent>
            </Select>
            {errors.strategy && <p className="text-sm text-destructive">{errors.strategy.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="batteryReserveLimit">Battery Reserve Limit (%)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="100"
              {...register("batteryReserveLimit", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">Minimum state of charge to maintain for backup.</p>
            {errors.batteryReserveLimit && <p className="text-sm text-destructive">{errors.batteryReserveLimit.message}</p>}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <Label>Vehicle-to-Grid (V2G)</Label>
              <p className="text-sm text-muted-foreground">Enable discharging EV battery to the grid/house.</p>
            </div>
            <Switch
              checked={watch("v2gEnabled")}
              onCheckedChange={(val) => setValue("v2gEnabled", val)}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <Label>Auto-Update Firmware</Label>
              <p className="text-sm text-muted-foreground">Allow NEMS device to automatically download and install updates.</p>
            </div>
            <Switch
              checked={watch("autoUpdate")}
              onCheckedChange={(val) => setValue("autoUpdate", val)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save and Push Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
