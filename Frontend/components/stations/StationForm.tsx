"use client";
import { logger } from "@/lib/logger";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const stationSchema = z.object({
  station_name: z.string().min(2, "Station name is required"),
  street_name: z.string().min(2, "Street name is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postal_code: z.string().min(2, "Postal code is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  on_site_person_name: z.string().min(2, "Contact person is required"),
  on_site_contact_details: z.string().min(2, "Contact details are required"),
  emergency_contact: z.string().min(2, "Emergency contact is required"),
});

type StationFormValues = z.infer<typeof stationSchema>;

interface StationFormProps {
  initialData?: StationFormValues & { id: number, owner_id?: number };
}

export function StationForm({ initialData }: StationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: initialData || {
      latitude: 0,
      longitude: 0,
    },
  });

  const onSubmit = async (data: StationFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        owner_id: initialData?.owner_id || user?.id,
      };
      if (initialData) {
        await api.put(`/stations/${initialData.id}`, payload);
      } else {
        await api.post('/stations', payload);
      }
      router.push('/stations');
      router.refresh();
    } catch (error) {
      logger.error("Failed to save station", error);
      alert("Failed to save station. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-sm">
      <CardHeader className="border-b pb-4">
        <CardTitle>{initialData ? 'Edit Station' : 'Create New Station'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="station_name">Station Name</Label>
            <Input id="station_name" {...register('station_name')} />
            {errors.station_name && <p className="text-sm text-destructive">{errors.station_name.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street_name">Street Address</Label>
              <Input id="street_name" {...register('street_name')} />
              {errors.street_name && <p className="text-sm text-destructive">{errors.street_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input id="state" {...register('state')} />
              {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input id="postal_code" {...register('postal_code')} />
              {errors.postal_code && <p className="text-sm text-destructive">{errors.postal_code.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
               <Input id="latitude" type="number" step="any" {...register('latitude', { valueAsNumber: true })} />
              {errors.latitude && <p className="text-sm text-destructive">{errors.latitude.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
               <Input id="longitude" type="number" step="any" {...register('longitude', { valueAsNumber: true })} />
              {errors.longitude && <p className="text-sm text-destructive">{errors.longitude.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="on_site_person_name">Site Manager Name</Label>
              <Input id="on_site_person_name" {...register('on_site_person_name')} />
              {errors.on_site_person_name && <p className="text-sm text-destructive">{errors.on_site_person_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="on_site_contact_details">Site Manager Phone</Label>
              <Input id="on_site_contact_details" {...register('on_site_contact_details')} />
              {errors.on_site_contact_details && <p className="text-sm text-destructive">{errors.on_site_contact_details.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact">Emergency Contact Info</Label>
            <Input id="emergency_contact" {...register('emergency_contact')} />
            {errors.emergency_contact && <p className="text-sm text-destructive">{errors.emergency_contact.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Station' : 'Create Station'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

