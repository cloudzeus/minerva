"use client";

import { useState } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateDevice } from "@/app/actions/milesight-devices";
import { toast } from "sonner";
import { FaSave, FaTimes } from "react-icons/fa";
import { MilesightDeviceCache } from "@prisma/client";

const editDeviceSchema = z.object({
  name: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  tag: z.string().optional().or(z.literal("")),
  displayOrder: z.number().int().optional().nullable(),
});

type EditDeviceFormData = z.infer<typeof editDeviceSchema>;

interface EditDeviceModalProps {
  device: MilesightDeviceCache;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalTSDevices?: number; // Total count of TS302/TS301 devices
}

export function EditDeviceModal({ device, open, onOpenChange, totalTSDevices = 1 }: EditDeviceModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Check if device is TS302 or TS301
  const isTSDevice = device.deviceType?.toUpperCase().includes("TS302") || 
                     device.deviceType?.toUpperCase().includes("TS-302") ||
                     device.deviceType?.toUpperCase().includes("TS301") ||
                     device.deviceType?.toUpperCase().includes("TS-301");

  // Generate order options from 1 to totalTSDevices
  const orderOptions = Array.from({ length: totalTSDevices }, (_, i) => i + 1);

  // Default displayOrder: use device's current value, or 1 if not set, but ensure it's within valid range
  const defaultDisplayOrder = device.displayOrder 
    ? Math.max(1, Math.min(device.displayOrder, totalTSDevices))
    : 1;

  const form = useForm<EditDeviceFormData>({
    resolver: zodResolver(editDeviceSchema),
    defaultValues: {
      name: device.name || "",
      description: device.description || "",
      tag: device.tag || "",
      displayOrder: defaultDisplayOrder,
    },
  });

  // Reset form when device changes or modal opens
  React.useEffect(() => {
    if (open) {
      const newDefaultDisplayOrder = device.displayOrder 
        ? Math.max(1, Math.min(device.displayOrder, totalTSDevices))
        : 1;
      form.reset({
        name: device.name || "",
        description: device.description || "",
        tag: device.tag || "",
        displayOrder: newDefaultDisplayOrder,
      });
    }
  }, [device, open, totalTSDevices, form]);

  async function onSubmit(values: EditDeviceFormData) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      if (values.name) formData.append("name", values.name);
      if (values.description) formData.append("description", values.description);
      if (values.tag) formData.append("tag", values.tag);
      if (values.displayOrder !== null && values.displayOrder !== undefined) {
        formData.append("displayOrder", values.displayOrder.toString());
      }

      const result = await updateDevice(device.deviceId, formData);

      if (result.success) {
        toast.success("Device updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error("Failed to update device", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base uppercase">Edit Device</DialogTitle>
          <DialogDescription className="text-xs">
            Update device information in Milesight platform
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium">Device Identifiers (Read-Only):</p>
              <p className="text-xs text-muted-foreground">
                SN: <span className="font-mono">{device.sn || "—"}</span>
              </p>
              {device.devEUI && (
                <p className="text-xs text-muted-foreground">
                  DevEUI: <span className="font-mono">{device.devEUI}</span>
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Device Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Temperature Sensor #1" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Device details..." className="text-sm resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Tag</FormLabel>
                  <FormControl>
                    <Input placeholder="warehouse-a" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {isTSDevice && (
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase">Dashboard Display Order</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString() ?? "1"}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select order" />
                        </SelectTrigger>
                        <SelectContent>
                          {orderOptions.map((order) => (
                            <SelectItem key={order} value={order.toString()}>
                              {order}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Select the position (1-{totalTSDevices}) for this device on dashboard cards. Lower numbers appear first.
                    </p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isLoading} size="sm" className="flex-1 text-xs">
                <FaSave className="mr-2 h-3 w-3" />
                {isLoading ? "UPDATING..." : "UPDATE DEVICE"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => onOpenChange(false)}
              >
                <FaTimes className="mr-2 h-3 w-3" />
                CANCEL
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

