"use client";
import { logger } from "@/lib/logger";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const tariffSchema = z.object({
  tariff_name: z.string().min(2, "Tariff name is required"),
  charge: z.number().min(0, "Fixed charge cannot be negative"),
  electricity_rate: z.number().min(0, "Rate cannot be negative"),
});

type TariffFormValues = z.infer<typeof tariffSchema>;

export function TariffForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<TariffFormValues>({
    resolver: zodResolver(tariffSchema),
    defaultValues: initialData || {
      charge: 0,
      electricity_rate: 0,
    },
  });

  const onSubmit = async (data: TariffFormValues) => {
    setIsLoading(true);
    try {
      if (initialData) {
        await api.put(`/tariffs/${initialData.tariff_id}`, data);
      } else {
        await api.post('/tariffs', data);
      }
      router.push('/tariffs');
      router.refresh();
    } catch (error: any) {
      logger.error("Failed to save tariff", error);
      alert(error.response?.data?.error || "Failed to save tariff structure. (Note: API endpoint might be missing from backend)");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-sm">
      <CardHeader className="border-b pb-4">
        <CardTitle>{initialData ? 'Edit Tariff Plan' : 'Create Tariff Plan'}</CardTitle>
        <CardDescription>
          Define pricing structures for electric vehicle charging sessions.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tariff_name">Tariff Plan Name</Label>
            <Input id="tariff_name" {...register('tariff_name')} placeholder="e.g. Standard rate, Fast Charging Peak" />
            {errors.tariff_name && <p className="text-sm text-destructive">{errors.tariff_name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="charge">Fixed Connection Charge ($)</Label>
              <Input id="charge" type="number" step="any" {...register('charge', { valueAsNumber: true })} />
              <p className="text-xs text-muted-foreground">Applied once per session.</p>
              {errors.charge && <p className="text-sm text-destructive">{errors.charge.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="electricity_rate">Electricity Rate ($ per kWh)</Label>
              <Input id="electricity_rate" type="number" step="any" {...register('electricity_rate', { valueAsNumber: true })} />
              <p className="text-xs text-muted-foreground">Applied per kWh consumed.</p>
              {errors.electricity_rate && <p className="text-sm text-destructive">{errors.electricity_rate.message}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {initialData ? 'Update Tariff' : 'Create Tariff'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

