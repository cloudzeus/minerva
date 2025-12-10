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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateDeviceSensorNames } from "@/app/actions/milesight-devices";
import { useTransition } from "react";
import { toast } from "sonner";
import { FaEdit } from "react-icons/fa";

const sensorNamesSchema = z.object({
  sensorNameLeft: z.string().min(1, "Sensor name is required").max(50, "Name too long"),
  sensorNameRight: z.string().min(1, "Sensor name is required").max(50, "Name too long"),
});

type SensorNamesFormData = z.infer<typeof sensorNamesSchema>;

interface DeviceSensorNamesEditorProps {
  deviceId: string;
  deviceType?: string | null;
  currentSensorNameLeft?: string | null;
  currentSensorNameRight?: string | null;
}

export function DeviceSensorNamesEditor({
  deviceId,
  deviceType,
  currentSensorNameLeft,
  currentSensorNameRight,
}: DeviceSensorNamesEditorProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const isTS302 = deviceType?.toUpperCase().includes("TS302") || deviceType?.toUpperCase().includes("TS-302");

  const form = useForm<SensorNamesFormData>({
    resolver: zodResolver(sensorNamesSchema),
    defaultValues: {
      sensorNameLeft: currentSensorNameLeft || "CH1",
      sensorNameRight: currentSensorNameRight || "CH2",
    },
  });

  const onSubmit = async (data: SensorNamesFormData) => {
    startTransition(async () => {
      try {
        const result = await updateDeviceSensorNames(deviceId, {
          sensorNameLeft: data.sensorNameLeft,
          sensorNameRight: data.sensorNameRight,
        });

        if (result.success) {
          toast.success("Sensor names updated successfully");
          setOpen(false);
          form.reset(data);
        } else {
          toast.error(result.error || "Failed to update sensor names");
        }
      } catch (error: any) {
        console.error("[Sensor Names Editor] Error:", error);
        toast.error(error.message || "Failed to update sensor names");
      }
    });
  };

  if (!isTS302) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <FaEdit className="mr-2 h-3 w-3" />
          Edit Sensor Names
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Sensor Names</DialogTitle>
          <DialogDescription>
            Customize the display names for CH1 and CH2 sensors on this TS302 device.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sensorNameLeft">CH1 Sensor Name</Label>
            <Input
              id="sensorNameLeft"
              {...form.register("sensorNameLeft")}
              placeholder="e.g., Room Temperature, Zone A, CH1"
              disabled={isPending}
            />
            {form.formState.errors.sensorNameLeft && (
              <p className="text-xs text-destructive">
                {form.formState.errors.sensorNameLeft.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sensorNameRight">CH2 Sensor Name</Label>
            <Input
              id="sensorNameRight"
              {...form.register("sensorNameRight")}
              placeholder="e.g., Ambient Temperature, Zone B, CH2"
              disabled={isPending}
            />
            {form.formState.errors.sensorNameRight && (
              <p className="text-xs text-destructive">
                {form.formState.errors.sensorNameRight.message}
              </p>
            )}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

