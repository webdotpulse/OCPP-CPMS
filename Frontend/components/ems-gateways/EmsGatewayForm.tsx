"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const gatewaySchema = z.object({
  client_id: z.number().int().positive("Client is required"),
  location_id: z.number().int().positive("Location is required").optional(),
});

type EmsGatewayFormValues = z.infer<typeof gatewaySchema>;

interface EmsGatewayFormProps {
  gatewayId?: string;
}

export function EmsGatewayForm({ gatewayId }: EmsGatewayFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [stationsList, setStationsList] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [createdGateway, setCreatedGateway] = useState<{ gateway_id: string; auth_token: string } | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<EmsGatewayFormValues>({
    resolver: zodResolver(gatewaySchema),
    defaultValues: {
      client_id: user?.id,
    }
  });

  useEffect(() => {
    if (user?.id) {
       setValue("client_id", user.id);
    }
  }, [user, setValue]);

  useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'superadmin')) {
      api.get('/users').then(res => setUsersList(res.data)).catch(console.error);
    }
    api.get('/stations').then(res => setStationsList(res.data)).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (gatewayId) {
      const fetchGateway = async () => {
        setIsFetching(true);
        try {
          const res = await api.get('/ems-gateways');
          const gateway = res.data.find((g: any) => g.gateway_id === gatewayId);
          if (gateway) {
            setInitialData(gateway);
            reset({
              client_id: gateway.client_id,
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

  const onSubmit = async (data: EmsGatewayFormValues) => {
    setIsLoading(true);
    try {
      if (initialData) {
        // Edit flow
        if ((user?.role === 'admin' || user?.role === 'superadmin')) {
          const payload = { client_id: data.client_id };
          await api.put(`/ems-gateways/${gatewayId}`, payload);
          toast.success("Gateway updated successfully");
          router.push('/ems-gateways');
          router.refresh();
        } else {
          toast.error("Only admins can edit gateways.");
        }
      } else {
        // Create flow
        const payload = {
          client_id: data.client_id,
          // location_id is kept in UI for context but omitted from payload as per backend schema
        };
        const response = await api.post('/ems-gateways', payload);
        toast.success("Gateway registered successfully");
        setCreatedGateway({
          gateway_id: response.data.gateway_id,
          auth_token: response.data.auth_token,
        });
        setShowTokenDialog(true);
      }
    } catch (error: any) {
      console.error("Failed to save EMS Gateway", error);
      toast.error(error.response?.data?.error || "Failed to save gateway. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (createdGateway?.auth_token || initialData?.auth_token) {
      navigator.clipboard.writeText(createdGateway?.auth_token || initialData?.auth_token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleCopyId = () => {
    if (createdGateway?.gateway_id || initialData?.gateway_id) {
      navigator.clipboard.writeText(createdGateway?.gateway_id || initialData?.gateway_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
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
    <>
      <Card className="w-full max-w-2xl shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle>{initialData ? ((user?.role === 'admin' || user?.role === 'superadmin') ? 'Edit Gateway' : 'View Gateway') : 'Register New Gateway'}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-5 pt-6">

            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <div className="space-y-2">
                <Label htmlFor="client_id">Assign to Client</Label>
                <Select
                  value={watch('client_id')?.toString() || initialData?.client_id?.toString() || user?.id?.toString()}
                  onValueChange={(val) => setValue('client_id', parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client user" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersList.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.email} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="location_id">Location (Optional Context)</Label>
              <Select
                value={watch('location_id')?.toString()}
                onValueChange={(val) => setValue('location_id', parseInt(val))}
                disabled={!!initialData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {stationsList.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecting a location is for reference. EMS Gateways are globally linked to the client.</p>
              {errors.location_id && <p className="text-sm text-destructive">{errors.location_id.message}</p>}
            </div>

            {initialData && (
               <div className="space-y-4 border-t pt-4">
                 <div className="space-y-2">
                   <Label>Gateway ID</Label>
                   <div className="flex items-center gap-2">
                     <Input readOnly value={initialData.gateway_id} className="font-mono bg-muted" />
                     <Button type="button" variant="outline" size="icon" onClick={handleCopyId}>
                       {copiedId ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                     </Button>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label>Auth Token (Hardware Key)</Label>
                   <div className="flex items-center gap-2">
                     <Input readOnly value={initialData.auth_token} className="font-mono bg-muted" />
                     <Button type="button" variant="outline" size="icon" onClick={handleCopyToken}>
                       {copiedToken ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                     </Button>
                   </div>
                 </div>
               </div>
            )}

          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
            <Button variant="outline" type="button" onClick={() => router.push('/ems-gateways')}>Cancel</Button>
            {(!initialData || (user?.role === 'admin' || user?.role === 'superadmin')) && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Update Gateway' : 'Register Gateway'}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>

      <Dialog open={showTokenDialog} onOpenChange={(open) => {
          setShowTokenDialog(open);
          if (!open) {
            router.push('/ems-gateways');
            router.refresh();
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
               <CheckCircle2 className="h-5 w-5" />
               Gateway Registered Successfully
            </DialogTitle>
            <DialogDescription>
              Please save the Gateway ID and Authentication Token below. You will need these to configure your local NEMS device. <strong className="text-red-500 block mt-2">The token will not be displayed again.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Gateway ID</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={createdGateway?.gateway_id || ""} className="font-mono" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyId}>
                  {copiedId ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hardware Auth Token</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={createdGateway?.auth_token || ""} className="font-mono" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyToken}>
                  {copiedToken ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="default" onClick={() => {
                setShowTokenDialog(false);
                router.push('/ems-gateways');
                router.refresh();
            }}>
              I have saved these details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
