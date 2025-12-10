 "use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { updateDeviceConfiguration } from "@/app/actions/milesight-devices";

const configSchema = z.object({
  properties: z
    .string()
    .min(2, "Configuration payload is required")
    .refine((value) => {
      try {
        const parsed = JSON.parse(value);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
      } catch (_error) {
        return false;
      }
    }, "Configuration must be valid JSON (object only)"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

interface DeviceConfigEditorProps {
  deviceId: string;
  currentConfig: Record<string, any> | null;
}

export function DeviceConfigEditor({
  deviceId,
  currentConfig,
}: DeviceConfigEditorProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultJson = useMemo(
    () => JSON.stringify(currentConfig ?? {}, null, 2),
    [currentConfig]
  );

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      properties: defaultJson,
    },
  });

  useEffect(() => {
    form.reset({ properties: defaultJson });
  }, [defaultJson, form]);

  const handleSubmit = (values: ConfigFormValues) => {
    startTransition(async () => {
      try {
        const parsed = JSON.parse(values.properties) as Record<string, any>;
        const result = await updateDeviceConfiguration(deviceId, parsed);

        if (!result.success) {
          toast.error("Failed to update configuration", {
            description: result.error || "Unexpected error occurred",
          });
          return;
        }

        toast.success("Configuration updated", {
          description: "Milesight is applying the new properties.",
        });
        setOpen(false);
      } catch (error: any) {
        toast.error("Configuration update failed", {
          description: error?.message || "Invalid configuration payload",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          UPDATE CONFIG
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm uppercase">Update Device Configuration</DialogTitle>
          <DialogDescription className="text-xs">
            Submit JSON properties exactly as expected by Milesight (same shape as the fetched config).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="properties"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Properties JSON</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={14}
                      className="font-mono text-xs"
                      placeholder={`{\n  "temperature_left": 2.5,\n  "battery": 98\n}`}
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
                {isPending ? "UPDATING…" : "APPLY CONFIG"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

