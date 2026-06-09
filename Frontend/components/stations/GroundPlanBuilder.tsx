"use client";

import React, { useState, useEffect } from "react";
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Save, RotateCw, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ParkingSpot {
  id: number;
  stationId: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  connectorId?: string;
  connector?: any;
}

interface Connector {
  connector_id: number;
  connector_name: string;
}

interface Props {
  stationId: string;
  connectors: Connector[];
}

// A simple draggable item
function DraggableSpot({
  spot,
  onUpdate,
  onDelete,
  connectors
}: {
  spot: ParkingSpot;
  onUpdate: (id: number, updates: Partial<ParkingSpot>) => void;
  onDelete: (id: number) => void;
  connectors: Connector[];
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `spot-${spot.id}`,
    data: spot,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: "absolute",
        left: spot.x,
        top: spot.y,
        width: spot.width,
        height: spot.height,
        transform: `rotate(${spot.rotation}deg)`,
      }}
      className="border-2 border-primary/50 bg-primary/10 rounded flex flex-col items-center justify-center p-2 cursor-move shadow-md"
      {...listeners}
      {...attributes}
    >
      <div className="absolute top-1 right-1 flex space-x-1">
         <button
           onPointerDown={(e) => { e.stopPropagation(); onUpdate(spot.id, { rotation: (spot.rotation + 45) % 360 }); }}
           className="p-1 bg-white/80 rounded-full hover:bg-white text-xs"
           title="Rotate"
         >
           <RotateCw size={12} />
         </button>
         <button
           onPointerDown={(e) => { e.stopPropagation(); onDelete(spot.id); }}
           className="p-1 bg-white/80 rounded-full hover:bg-red-100 text-red-600 text-xs"
           title="Delete"
         >
           <Trash2 size={12} />
         </button>
      </div>

      <div className="w-full text-center" onPointerDown={e => e.stopPropagation()}>
         <Input
           value={spot.name}
           onChange={e => onUpdate(spot.id, { name: e.target.value })}
           className="h-6 text-xs text-center border-none bg-transparent font-medium p-0 focus-visible:ring-0 shadow-none"
           placeholder="Spot Name"
         />
      </div>

      <div className="mt-2 w-full text-center" onPointerDown={e => e.stopPropagation()}>
         <Select
           value={spot.connectorId?.toString() || "unassigned"}
           onValueChange={(val) => onUpdate(spot.id, { connectorId: val === "unassigned" ? undefined : val })}
         >
           <SelectTrigger className="h-6 text-[10px] w-full p-1 bg-white/50 border-none">
             <SelectValue placeholder="No connector" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
             {connectors.map(c => (
               <SelectItem key={c.connector_id} value={c.connector_id.toString()} className="text-xs">
                 {c.connector_name}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
      </div>
    </div>
  );
}

export function GroundPlanBuilder({ stationId, connectors }: Props) {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/stations/${stationId}/parking-spots`);
        setSpots(
          res.data.data.map((s: any) => ({
            ...s,
            connectorId: s.connector ? s.connector.connector_id.toString() : undefined,
          }))
        );
      } catch (err) {
        toast.error("Failed to load ground plan");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [stationId]);

  const addSpot = () => {
    const newSpot: ParkingSpot = {
      id: Date.now(), // Temporary ID
      stationId: parseInt(stationId, 10),
      name: `Spot ${spots.length + 1}`,
      x: 50,
      y: 50,
      width: 100,
      height: 140,
      rotation: 0,
    };
    setSpots([...spots, newSpot]);
  };

  const updateSpot = (id: number, updates: Partial<ParkingSpot>) => {
    setSpots(spots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSpot = (id: number) => {
    setSpots(spots.filter(s => s.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (active) {
      setSpots((prev) =>
        prev.map((spot) => {
          if (`spot-${spot.id}` === active.id) {
            return {
              ...spot,
              x: Math.max(0, spot.x + delta.x),
              y: Math.max(0, spot.y + delta.y),
            };
          }
          return spot;
        })
      );
    }
  };

  const savePlan = async () => {
    setIsSaving(true);
    try {
      await api.put(`/stations/${stationId}/parking-spots`, { spots });
      toast.success("Ground plan saved successfully");
    } catch (err) {
      toast.error("Failed to save ground plan");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Ground Plan Builder</h3>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={addSpot}>
            <Plus className="mr-2 h-4 w-4" /> Add Spot
          </Button>
          <Button size="sm" onClick={savePlan} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : "Save Plan"}
          </Button>
        </div>
      </div>

      <div className="relative w-full h-[600px] bg-slate-50 dark:bg-slate-900 border rounded-xl overflow-hidden shadow-inner bg-[url('/grid.svg')] bg-center">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {spots.map((spot) => (
            <DraggableSpot
               key={spot.id}
               spot={spot}
               onUpdate={updateSpot}
               onDelete={deleteSpot}
               connectors={connectors}
            />
          ))}
        </DndContext>
      </div>
    </div>
  );
}
