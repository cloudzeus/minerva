"use client";

import { useState } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDevice } from "@/app/actions/milesight-devices";
import { toast } from "sonner";
import { FaSave, FaTimes } from "react-icons/fa";

const addDeviceSchema = z.object({
  sn: z.string().min(1, "Serial number is required"),
  devEUI: z.string().optional().or(z.literal("")),
  imei: z.string().optional().or(z.literal("")),
  name: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  tag: z.string().optional().or(z.literal("")),
});

type AddDeviceFormData = z.infer<typeof addDeviceSchema>;

interface AddDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDeviceModal({ open, onOpenChange }: AddDeviceModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddDeviceFormData>({
    resolver: zodResolver(addDeviceSchema),
    defaultValues: {
      sn: "",
      devEUI: "",
      imei: "",
      name: "",
      description: "",
      tag: "",
    },
  });

  async function onSubmit(values: AddDeviceFormData) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("sn", values.sn);
      if (values.devEUI) formData.append("devEUI", values.devEUI);
      if (values.imei) formData.append("imei", values.imei);
      if (values.name) formData.append("name", values.name);
      if (values.description) formData.append("description", values.description);
      if (values.tag) formData.append("tag", values.tag);

      const result = await createDevice(formData);

      if (result.success) {
        toast.success("Device added successfully", {
          description: `${values.name || values.sn} has been added to Milesight`,
        });
        onOpenChange(false);
        form.reset();
        router.refresh();
      } else {
        toast.error("Failed to add device", {
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base uppercase">Add New Device</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new device to your Milesight application
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Serial Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="SN-12345678" className="text-sm font-mono" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Device serial number (required)
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="devEUI"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">DevEUI</FormLabel>
                  <FormControl>
                    <Input placeholder="0123456789ABCDEF" className="text-sm font-mono" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    LoRaWAN Device EUI (optional)
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imei"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">IMEI</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" className="text-sm font-mono" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    For cellular devices (optional)
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

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

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isLoading} size="sm" className="flex-1 text-xs">
                <FaSave className="mr-2 h-3 w-3" />
                {isLoading ? "ADDING..." : "ADD DEVICE"}
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

