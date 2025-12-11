"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTransition } from "react";
import { toast } from "sonner";
import { FaEdit, FaArrowUp, FaArrowDown, FaGripVertical } from "react-icons/fa";
import { updateDeviceSensorDisplayOrder } from "@/app/actions/milesight-devices";
import { cn } from "@/lib/utils";

interface DeviceSensorOrderEditorProps {
  deviceId: string;
  currentOrder: string[] | null;
  availableProperties: string[];
}

export function DeviceSensorOrderEditor({
  deviceId,
  currentOrder,
  availableProperties,
}: DeviceSensorOrderEditorProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [order, setOrder] = React.useState<string[]>(() => {
    if (currentOrder && currentOrder.length > 0) {
      // Merge current order with any new properties
      const merged = [...currentOrder];
      availableProperties.forEach((prop) => {
        if (!merged.includes(prop)) {
          merged.push(prop);
        }
      });
      return merged.filter((prop) => availableProperties.includes(prop));
    }
    return availableProperties;
  });

  React.useEffect(() => {
    if (currentOrder && currentOrder.length > 0) {
      const merged = [...currentOrder];
      availableProperties.forEach((prop) => {
        if (!merged.includes(prop)) {
          merged.push(prop);
        }
      });
      setOrder(merged.filter((prop) => availableProperties.includes(prop)));
    } else {
      setOrder(availableProperties);
    }
  }, [currentOrder, availableProperties]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
  };

  const onSubmit = async () => {
    startTransition(async () => {
      try {
        const result = await updateDeviceSensorDisplayOrder(deviceId, order);

        if (result.success) {
          toast.success("Sensor display order updated successfully");
          setOpen(false);
        } else {
          toast.error(result.error || "Failed to update display order");
        }
      } catch (error: any) {
        console.error("[Sensor Order Editor] Error:", error);
        toast.error(error.message || "Failed to update display order");
      }
    });
  };

  if (availableProperties.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <FaEdit className="mr-2 h-3 w-3" />
          Edit Display Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Sensor Display Order</DialogTitle>
          <DialogDescription>
            Reorder the sensor properties to customize how they appear in the telemetry card.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {order.map((prop, index) => (
            <div
              key={prop}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-3",
                "bg-card hover:bg-muted/50 transition-colors"
              )}
            >
              <FaGripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">
                {prop.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || isPending}
                >
                  <FaArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => moveDown(index)}
                  disabled={index === order.length - 1 || isPending}
                >
                  <FaArrowDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


