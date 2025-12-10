 "use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { triggerFirmwareUpgrade } from "@/app/actions/milesight-devices";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const firmwareSchema = z.object({
  firmwareVersion: z
    .string()
    .min(1, "Firmware version is required")
    .max(64, "Keep firmware version under 64 characters"),
  firmwareFileId: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  releaseNotes: z
    .string()
    .max(500, "Release notes limited to 500 characters")
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
});

type FirmwareFormValues = z.infer<typeof firmwareSchema>;

interface DeviceFirmwareUpdaterProps {
  deviceId: string;
  currentVersion?: string | null;
}

export function DeviceFirmwareUpdater({
  deviceId,
  currentVersion,
}: DeviceFirmwareUpdaterProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FirmwareFormValues>({
    resolver: zodResolver(firmwareSchema),
    defaultValues: {
      firmwareVersion: currentVersion || "",
      firmwareFileId: "",
      releaseNotes: "",
    },
  });

  const handleSubmit = (values: FirmwareFormValues) => {
    startTransition(async () => {
      const result = await triggerFirmwareUpgrade(deviceId, values);

      if (!result.success) {
        toast.error("Failed to trigger firmware update", {
          description: result.error || "Unexpected error occurred",
        });
        return;
      }

      toast.success("Firmware update triggered", {
        description: `Milesight is processing version ${values.firmwareVersion}`,
      });
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          UPDATE FIRMWARE
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm uppercase">Trigger Firmware Update</DialogTitle>
          <DialogDescription className="text-xs">
            Send an OTA request via Milesight API. Device must stay online during the update.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firmwareVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Target Version</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. V1.3.5" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firmwareFileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Firmware File ID (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Milesight firmware file ID" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releaseNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Release Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes displayed in Milesight console"
                      className="text-sm"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                CANCEL
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "SENDING…" : "TRIGGER UPDATE"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

