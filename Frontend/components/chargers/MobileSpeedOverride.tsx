"use client";

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MobileSpeedOverrideProps {
  chargerId: number | string;
  currentPower: number;
}

export function MobileSpeedOverride({ chargerId, currentPower }: MobileSpeedOverrideProps) {
  const [limit, setLimit] = useState<number>(32); // Default to 32A, user can slide
  const [isSetting, setIsSetting] = useState(false);

  const handleSetLimit = async () => {
    setIsSetting(true);
    try {
      const payload = {
        chargerId,
        connectorId: 1, // Defaulting to 1 for generic override
        csChargingProfiles: {
          chargingProfileId: Math.floor(Math.random() * 1000) + 1,
          stackLevel: 1,
          chargingProfilePurpose: "TxProfile",
          chargingProfileKind: "Relative",
          chargingSchedule: {
            chargingRateUnit: "A",
            chargingSchedulePeriod: [
              {
                startPeriod: 0,
                limit: limit,
              }
            ]
          }
        }
      };

      await api.post('/ocpp/set-charging-profile', payload);
      toast.success(`Speed limit set to ${limit}A successfully`);
    } catch (error) {
      console.error('Failed to set charging profile:', error);
      toast.error('Failed to set speed limit. Ensure the charger is connected.');
    } finally {
      setIsSetting(false);
    }
  };

  const currentPowerKw = currentPower > 0 ? (currentPower / 1000).toFixed(2) : '0.00';

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-background shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-sm">Charging Speed</h3>
          <p className="text-xs text-muted-foreground">Adjust current limit</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-blue-500">{currentPowerKw} <span className="text-sm text-muted-foreground font-normal">kW</span></div>
          <p className="text-[10px] text-muted-foreground uppercase">Current Power</p>
        </div>
      </div>

      <div className="pt-4 pb-2">
        <Slider
          defaultValue={[32]}
          max={32}
          min={6}
          step={1}
          value={[limit]}
          onValueChange={(vals) => setLimit(vals[0])}
          className="my-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
          <span>6A</span>
          <span className="font-bold text-foreground bg-secondary px-2 py-0.5 rounded-full">{limit}A Limit</span>
          <span>32A</span>
        </div>
      </div>

      <Button
        className="w-full h-12 text-sm font-semibold rounded-lg"
        onClick={handleSetLimit}
        disabled={isSetting}
      >
        {isSetting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Applying Limit...
          </>
        ) : (
          `Set Limit to ${limit}A`
        )}
      </Button>
    </div>
  );
}
