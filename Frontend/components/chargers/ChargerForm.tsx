"use client";
import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const chargerSchema = z.object({
  name: z.string().min(2, "Charger name is required"),
  model: z.string().min(2, "Model is required"),
  manufacturer: z.string().min(2, "Manufacturer is required"),
  serial_number: z.string().min(2, "Serial number is required"),
  manufacturing_date: z.string(),
  power_capacity: z.number().positive(),
  power_consumption: z.number().nonnegative(),
  firmware_version: z.string().min(1, "Firmware version is required"),
  warranty_period: z.string(),
  service_contacts: z.string(),
  charging_station_id: z.number().positive("Must assign a station"),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  tariffId: z.number().optional(),
});

type ChargerFormValues = z.infer<typeof chargerSchema>;

export function ChargerForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [stations, setStations] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ChargerFormValues>({
    resolver: zodResolver(chargerSchema),
    defaultValues: initialData ? {
      ...initialData,
      manufacturing_date: new Date(initialData.manufacturing_date).toISOString().substring(0, 10),
      latitude: initialData?.latitude || undefined,
      longitude: initialData?.longitude || undefined,
      tariffId: initialData?.tariffs?.[0]?.tariff_id || undefined,
    } : {
      power_consumption: 0,
      latitude: undefined,
      longitude: undefined,
      tariffId: initialData?.tariffs?.[0]?.tariff_id || undefined,
    },
  });

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const [stationsRes, tariffsRes] = await Promise.all([
          api.get('/stations'),
          api.get('/tariffs')
        ]);
        setStations(stationsRes.data);
        setTariffs(tariffsRes.data);
      } catch (error) {
        logger.error("Failed to fetch initial data", error);
      }
    };
    fetchStations();
  }, []);

  const stationId = watch('charging_station_id');

  const onSubmit = async (data: ChargerFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        manufacturing_date: new Date(data.manufacturing_date).toISOString(),
        owner_id: initialData?.owner_id || user?.id,
      };

      if (initialData) {
        await api.put(`/chargers/${initialData.charger_id}`, payload);
      } else {
        await api.post('/chargers', payload);
      }
      router.push('/chargers');
      router.refresh();
    } catch (error: any) {
      logger.error("Failed to save charger", error);
      alert(error.response?.data?.error || "Failed to save charger.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl shadow-sm">
      <CardHeader className="border-b pb-4">
        <CardTitle>{initialData ? 'Edit Charger' : 'Register New Charger'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Charger Identity (OCPP ID)</Label>
              <Input id="name" {...register('name')} placeholder="e.g. Charger-A01" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="charging_station_id">Assign to Station</Label>
              <Select 
                value={stationId ? stationId.toString() : ''} 
                onValueChange={(val) => setValue('charging_station_id', parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.charging_station_id && <p className="text-sm text-destructive">{errors.charging_station_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" {...register('manufacturer')} />
              {errors.manufacturer && <p className="text-sm text-destructive">{errors.manufacturer.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...register('model')} />
              {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input id="serial_number" {...register('serial_number')} />
              {errors.serial_number && <p className="text-sm text-destructive">{errors.serial_number.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="firmware_version">Firmware Version</Label>
              <Input id="firmware_version" {...register('firmware_version')} />
              {errors.firmware_version && <p className="text-sm text-destructive">{errors.firmware_version.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="power_capacity">Power Capacity (kW)</Label>
              <Input id="power_capacity" type="number" step="any" {...register('power_capacity', { valueAsNumber: true })} />
              {errors.power_capacity && <p className="text-sm text-destructive">{errors.power_capacity.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
              <Input id="manufacturing_date" type="date" {...register('manufacturing_date')} />
              {errors.manufacturing_date && <p className="text-sm text-destructive">{errors.manufacturing_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="power_consumption">Standby Power Consumption (kWh/day)</Label>
              <Input id="power_consumption" type="number" step="any" {...register('power_consumption', { valueAsNumber: true })} />
              {errors.power_consumption && <p className="text-sm text-destructive">{errors.power_consumption.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="warranty_period">Warranty Period</Label>
              <Input id="warranty_period" {...register('warranty_period')} placeholder="e.g. 2 Years" />
              {errors.warranty_period && <p className="text-sm text-destructive">{errors.warranty_period.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
             <div className="space-y-2">
              <Label htmlFor="tariffId">Assigned Tariff Plan</Label>
              <Select 
                value={watch('tariffId')?.toString() || 'none'} 
                onValueChange={(val) => setValue('tariffId', val === 'none' ? undefined : parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tariff plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Tariff Plan</SelectItem>
                  {tariffs.map(tariff => (
                    <SelectItem key={tariff.tariff_id} value={tariff.tariff_id.toString()}>
                      {tariff.tariff_name} (${tariff.charge} + ${tariff.electricity_rate}/kWh)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_contacts">Service Contacts</Label>
              <Input id="service_contacts" {...register('service_contacts')} />
              {errors.service_contacts && <p className="text-sm text-destructive">{errors.service_contacts.message}</p>}
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              <strong>Please fix the following errors:</strong>
              <ul className="list-disc list-inside mt-1">
                {Object.entries(errors).map(([key, error]: [string, any]) => (
                  <li key={key}>{key}: {error.message}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {initialData ? 'Update Charger' : 'Register Charger'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

