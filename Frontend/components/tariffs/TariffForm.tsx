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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const tariffSchema = z.object({
  tariff_name: z.string().min(2, "Tariff name is required"),
  tariffType: z.enum(["FIXED", "DYNAMIC_EPEX"]).default("FIXED"),

  // FIXED fields
  charge: z.number().min(0, "Fixed charge cannot be negative").optional(),
  electricity_rate: z.number().min(0, "Rate cannot be negative").optional(),

  // DYNAMIC_EPEX fields
  country: z.enum(["BE", "NL"]).optional(),
  markupPerKwh: z.number().min(0, "Markup cannot be negative").optional(),
  taxPercentage: z.number().min(0, "Tax cannot be negative").optional(),
  fixedFeePerMonth: z.number().min(0, "Fixed fee cannot be negative").optional(),
}).refine(data => {
  if (data.tariffType === "DYNAMIC_EPEX") {
    return !!data.country && data.markupPerKwh !== undefined && data.taxPercentage !== undefined && data.fixedFeePerMonth !== undefined;
  }
  return data.charge !== undefined && data.electricity_rate !== undefined;
}, {
  message: "Please fill in all required fields for the selected pricing model",
  path: ["tariffType"]
});

type TariffFormValues = z.infer<typeof tariffSchema>;

export function TariffForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ time: string; price: number }[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TariffFormValues>({
    resolver: zodResolver(tariffSchema) as any,
    defaultValues: initialData || {
      tariffType: "FIXED",
      charge: 0,
      electricity_rate: 0,
      country: "BE",
      markupPerKwh: 0,
      taxPercentage: 21,
      fixedFeePerMonth: 0,
    },
  });

  const selectedTariffType = watch("tariffType");
  const watchCountry = watch("country");
  const watchMarkup = watch("markupPerKwh");
  const watchTax = watch("taxPercentage");

  useEffect(() => {
    if (selectedTariffType !== "DYNAMIC_EPEX") return;

    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      try {
        const res = await api.post("/tariffs/preview-epex", {
          country: watchCountry,
          markupPerKwh: watchMarkup,
          taxPercentage: watchTax,
        });

        if (res.data?.data) {
          const formattedData = res.data.data.map((item: any) => {
            const d = new Date(item.timestamp);
            return {
              time: `${d.getHours().toString().padStart(2, "0")}:00`,
              price: item.price,
            };
          });
          setPreviewData(formattedData);
        }
      } catch (error) {
        logger.error("Failed to fetch EPEX preview", error);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      if (watchCountry && watchMarkup !== undefined && watchTax !== undefined) {
        fetchPreview();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [selectedTariffType, watchCountry, watchMarkup, watchTax]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tariff_name">Tariff Plan Name</Label>
              <Input id="tariff_name" {...register('tariff_name')} placeholder="e.g. Standard rate, Fast Charging Peak" />
              {errors.tariff_name && <p className="text-sm text-destructive">{errors.tariff_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tariffType">Pricing Model</Label>
              <Select
                defaultValue={selectedTariffType}
                onValueChange={(value) => setValue("tariffType", value as "FIXED" | "DYNAMIC_EPEX")}
              >
                <SelectTrigger id="tariffType">
                  <SelectValue placeholder="Select Pricing Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Rate</SelectItem>
                  <SelectItem value="DYNAMIC_EPEX">Dynamic EPEX Spot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {errors.tariffType && <p className="text-sm text-destructive">{errors.tariffType.message}</p>}

          {selectedTariffType === "FIXED" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="charge">Fixed Connection Charge (€)</Label>
                <Input id="charge" type="number" step="any" {...register('charge', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Applied once per session.</p>
                {errors.charge && <p className="text-sm text-destructive">{errors.charge.message}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="electricity_rate">Electricity Rate (€ per kWh)</Label>
                <Input id="electricity_rate" type="number" step="any" {...register('electricity_rate', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Applied per kWh consumed.</p>
                {errors.electricity_rate && <p className="text-sm text-destructive">{errors.electricity_rate.message}</p>}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country (EPEX Zone)</Label>
                <Select
                  defaultValue={watch("country")}
                  onValueChange={(value) => setValue("country", value as "BE" | "NL")}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BE">Belgium (BE)</SelectItem>
                    <SelectItem value="NL">Netherlands (NL)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="markupPerKwh">Markup (€ per kWh)</Label>
                <Input id="markupPerKwh" type="number" step="any" {...register('markupPerKwh', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Added to the EPEX Spot rate.</p>
                {errors.markupPerKwh && <p className="text-sm text-destructive">{errors.markupPerKwh.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxPercentage">Tax Rate (%)</Label>
                <Input id="taxPercentage" type="number" step="any" {...register('taxPercentage', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">e.g. 21 for 21% VAT.</p>
                {errors.taxPercentage && <p className="text-sm text-destructive">{errors.taxPercentage.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixedFeePerMonth">Fixed Monthly Fee (€)</Label>
                <Input id="fixedFeePerMonth" type="number" step="any" {...register('fixedFeePerMonth', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Information only, not automatically billed.</p>
                {errors.fixedFeePerMonth && <p className="text-sm text-destructive">{errors.fixedFeePerMonth.message}</p>}
              </div>
            </div>
          )}

          {selectedTariffType === "DYNAMIC_EPEX" && (
            <div className="border-t pt-4 space-y-4">
              <Label>24-Hour Price Preview (€ per kWh)</Label>
              <div className="h-[250px] w-full bg-slate-50/50 dark:bg-slate-900/50 rounded-md p-4 border">
                {isPreviewLoading ? (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading preview...
                  </div>
                ) : previewData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={previewData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickFormatter={(value) => `€${value.toFixed(2)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)"
                        }}
                        formatter={(value: any) => [`€${Number(value).toFixed(4)}`, "Price per kWh"]}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold", marginBottom: "4px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    Preview data unavailable. Check parameters or backend connection.
                  </div>
                )}
              </div>
            </div>
          )}
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

