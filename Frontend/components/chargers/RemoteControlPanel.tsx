"use client";
import { logger } from "@/lib/logger";

import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Play, Square, RefreshCw, Unlock, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RemoteControlPanelProps {
  chargerId: number;
}

export function RemoteControlPanel({ chargerId }: RemoteControlPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tagId, setTagId] = useState("");
  const [connectorId, setConnectorId] = useState("1");
  const [transactionId, setTransactionId] = useState("");

  const sendCommand = async (endpoint: string, payload: any = {}) => {
    setIsLoading(true);
    try {
      const response = await api.post(`/ocpp/${endpoint}`, { chargerId, ...payload });
      alert(`Command sent successfully: ${response.data.message || 'Accepted'}`);
    } catch (error: any) {
      logger.error(`Failed to send ${endpoint}`, error);
      alert(error.response?.data?.error || `Failed to send ${endpoint} command`);
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
          <Button 
            variant="outline" 
            onClick={() => sendCommand('trigger-message', { requestedMessage: 'StatusNotification' })}
            disabled={isLoading}
          >
            <Send className="mr-2 h-4 w-4" /> Trigger Status
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          {/* Remote Start */}
          <div className="space-y-4">
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
              <Play className="mr-2 h-4 w-4" /> Remote Start
            </Button>
          </div>

          {/* Remote Stop */}
          <div className="space-y-4">
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
              <Square className="mr-2 h-4 w-4" /> Remote Stop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

