"use client";
import { logger } from "@/lib/logger";

import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Zap, Play, Square, RefreshCw, Unlock, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RemoteControlPanelProps {
  chargerId: number;
}

export function RemoteControlPanel({ chargerId }: RemoteControlPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tagId, setTagId] = useState("");
  const [connectorId, setConnectorId] = useState("1");
  const [transactionId, setTransactionId] = useState("");
  const [triggerMessageTarget, setTriggerMessageTarget] = useState("StatusNotification");
  const [showRemoteStart, setShowRemoteStart] = useState(false);
  const [showRemoteStop, setShowRemoteStop] = useState(false);
  const [showTestAuth, setShowTestAuth] = useState(false);
  const [showFirmwareUpdate, setShowFirmwareUpdate] = useState(false);
  const [firmwareLocation, setFirmwareLocation] = useState("");
  const [testTagId, setTestTagId] = useState("");

  const testAuthTag = async () => {
    setIsLoading(true);
    try {
      const response = await api.post(`/ocpp/test-auth`, { idTag: testTagId });
      if (response.data.valid) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      logger.error('Failed to test auth', error);
      toast.error(error.response?.data?.error || 'Failed to test auth');
    } finally {
      setIsLoading(false);
    }
  };

  const sendCommand = async (endpoint: string, payload: any = {}) => {
    setIsLoading(true);
    try {
      const response = await api.post(`/ocpp/${endpoint}`, { chargerId, ...payload });
      toast.success(`Command sent successfully: ${response.data.message || 'Accepted'}`);
    } catch (error: any) {
      logger.error(`Failed to send ${endpoint}`, error);
      toast.error(error.response?.data?.error || `Failed to send ${endpoint} command`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> 
          OCPP Remote Controls
        </CardTitle>
        <CardDescription>Issue commands directly to the charge point.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => sendCommand('reset', { type: 'Soft' })}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Soft Reset
          </Button>
          <Button 
            variant="outline" 
            onClick={() => sendCommand('reset', { type: 'Hard' })}
            disabled={isLoading}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Hard Reset
          </Button>
          <Button 
            variant="outline" 
            onClick={() => sendCommand('unlock', { connectorId: parseInt(connectorId) })}
            disabled={isLoading}
          >
            <Unlock className="mr-2 h-4 w-4" /> Unlock Connector
          </Button>
          <div className="flex items-center gap-2">
            <Select value={triggerMessageTarget} onValueChange={setTriggerMessageTarget}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Message" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BootNotification">BootNotification</SelectItem>
                <SelectItem value="DiagnosticsStatusNotification">DiagnosticsStatusNotification</SelectItem>
                <SelectItem value="FirmwareStatusNotification">FirmwareStatusNotification</SelectItem>
                <SelectItem value="Heartbeat">Heartbeat</SelectItem>
                <SelectItem value="MeterValues">MeterValues</SelectItem>
                <SelectItem value="StatusNotification">StatusNotification</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => sendCommand('trigger-message', { requestedMessage: triggerMessageTarget })}
              disabled={isLoading || !triggerMessageTarget}
            >
              <Send className="mr-2 h-4 w-4" /> Trigger Message
            </Button>
          </div>

          <Button
            variant={showRemoteStart ? "default" : "outline"}
            onClick={() => setShowRemoteStart(!showRemoteStart)}
            className="whitespace-nowrap"
          >
            <Play className="mr-2 h-4 w-4" /> Remote Start Transaction
          </Button>

          <Button
            variant={showRemoteStop ? "default" : "outline"}
            onClick={() => setShowRemoteStop(!showRemoteStop)}
            className="whitespace-nowrap"
          >
            <Square className="mr-2 h-4 w-4" /> Remote Stop Transaction
          </Button>

          <Button
            variant={showTestAuth ? "default" : "outline"}
            onClick={() => setShowTestAuth(!showTestAuth)}
            className="whitespace-nowrap"
          >
            <Unlock className="mr-2 h-4 w-4" /> Test RFID Card
          </Button>

          <Button
            variant={showFirmwareUpdate ? "default" : "outline"}
            onClick={() => setShowFirmwareUpdate(!showFirmwareUpdate)}
            className="whitespace-nowrap"
          >
            <Zap className="mr-2 h-4 w-4" /> Update Firmware
          </Button>
        </div>

        {(showRemoteStart || showRemoteStop || showTestAuth || showFirmwareUpdate) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            {/* Remote Start */}
            {showRemoteStart && (
              <div className="space-y-4 border p-4 rounded-md">
                <h4 className="font-medium text-sm">Remote Start Transaction</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Connector ID</Label>
                    <Input value={connectorId} onChange={e => setConnectorId(e.target.value)} type="number" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">RFID Tag ID</Label>
                    <Input value={tagId} onChange={e => setTagId(e.target.value)} placeholder="e.g. DEADBEAF" />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => sendCommand('remote-start', { connectorId: parseInt(connectorId), idTag: tagId })}
                  disabled={isLoading || !tagId}
                >
                  <Play className="mr-2 h-4 w-4" /> Send Start Command
                </Button>
              </div>
            )}

            {/* Remote Stop */}
            {showRemoteStop && (
              <div className="space-y-4 border p-4 rounded-md">
                <h4 className="font-medium text-sm">Remote Stop Transaction</h4>
                <div className="space-y-1">
                  <Label className="text-xs">Transaction ID</Label>
                  <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} type="number" placeholder="Enter Txn ID" />
                </div>
                <Button
                  variant="destructive"
                  className="w-full text-destructive bg-destructive/10 hover:bg-destructive hover:text-white border-0"
                  onClick={() => sendCommand('remote-stop', { transactionId: parseInt(transactionId) })}
                  disabled={isLoading || !transactionId}
                >
                  <Square className="mr-2 h-4 w-4" /> Send Stop Command
                </Button>
              </div>
            )}

            {/* Test Auth */}
            {showTestAuth && (
              <div className="space-y-4 border p-4 rounded-md">
                <h4 className="font-medium text-sm">Test RFID Card</h4>
                <div className="space-y-1">
                  <Label className="text-xs">RFID Tag ID</Label>
                  <Input value={testTagId} onChange={e => setTestTagId(e.target.value)} placeholder="e.g. DEADBEAF" />
                </div>
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={testAuthTag}
                  disabled={isLoading || !testTagId}
                >
                  <Unlock className="mr-2 h-4 w-4" /> Test Card
                </Button>
              </div>
            )}

            {/* Firmware Update */}
            {showFirmwareUpdate && (
              <div className="space-y-4 border p-4 rounded-md">
                <h4 className="font-medium text-sm">Update Firmware</h4>
                <div className="space-y-1">
                  <Label className="text-xs">Firmware Location URL</Label>
                  <Input value={firmwareLocation} onChange={e => setFirmwareLocation(e.target.value)} placeholder="ftp://server/firmware.bin" />
                </div>
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={() => sendCommand('update-firmware', { location: firmwareLocation })}
                  disabled={isLoading || !firmwareLocation}
                >
                  <Zap className="mr-2 h-4 w-4" /> Trigger Update
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

