"use client";

import * as React from "react";
import { useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaEdit, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { updateDeviceDisplayOrder } from "@/app/actions/milesight-devices";
import { toast } from "sonner";

interface DeviceDisplayOrderEditorProps {
  deviceId: string;
  deviceName: string;
  currentDisplayOrder: number | null;
}

export function DeviceDisplayOrderEditor({
  deviceId,
  deviceName,
  currentDisplayOrder,
}: DeviceDisplayOrderEditorProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [displayOrder, setDisplayOrder] = React.useState<number>(
    currentDisplayOrder ?? 0
  );

  React.useEffect(() => {
    setDisplayOrder(currentDisplayOrder ?? 0);
  }, [currentDisplayOrder]);

  const onSubmit = async () => {
    startTransition(async () => {
      try {
        const result = await updateDeviceDisplayOrder(deviceId, displayOrder);

        if (result.success) {
          toast.success("Display order updated successfully");
          setOpen(false);
        } else {
          toast.error(result.error || "Failed to update display order");
        }
      } catch (error: any) {
        console.error("[Display Order Editor] Error:", error);
        toast.error(error.message || "Failed to update display order");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <FaEdit className="mr-2 h-3 w-3" />
          Edit Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Display Order</DialogTitle>
          <DialogDescription>
            Set the display order for "{deviceName}" on dashboard cards. Lower numbers appear first.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <div className="flex items-center gap-2">
              <Input
                id="displayOrder"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                disabled={isPending}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDisplayOrder((prev) => Math.max(0, prev - 1))}
                disabled={isPending}
              >
                <FaArrowDown className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDisplayOrder((prev) => prev + 1)}
                disabled={isPending}
              >
                <FaArrowUp className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first on dashboard. Default is 0.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setDisplayOrder(currentDisplayOrder ?? 0);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
