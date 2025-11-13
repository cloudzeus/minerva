"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  saveWebhookSettings,
  testWebhook,
  clearWebhookEvents,
} from "@/app/actions/milesight-webhook";
import { toast } from "sonner";
import {
  FaSave,
  FaPlug,
  FaTrash,
} from "react-icons/fa";
import { MilesightWebhookSettings } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const webhookSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  webhookUuid: z.string().optional().or(z.literal("")),
  webhookSecret: z.string().optional().or(z.literal("")),
  verificationToken: z.string().optional().or(z.literal("")),
});

type WebhookSettingsFormData = z.infer<typeof webhookSettingsSchema>;

interface MilesightWebhookSettingsFormProps {
  initialSettings: MilesightWebhookSettings | null;
}

export function MilesightWebhookSettingsForm({
  initialSettings,
}: MilesightWebhookSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const form = useForm<WebhookSettingsFormData>({
    resolver: zodResolver(webhookSettingsSchema),
    defaultValues: {
      enabled: initialSettings?.enabled ?? true,
      webhookUuid: initialSettings?.webhookUuid || "",
      webhookSecret: initialSettings?.webhookSecret || "",
      verificationToken: initialSettings?.verificationToken || "",
    },
  });

  async function onSubmit(values: WebhookSettingsFormData) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("enabled", values.enabled.toString());
      formData.append("webhookUuid", values.webhookUuid || "");
      formData.append("webhookSecret", values.webhookSecret || "");
      formData.append("verificationToken", values.verificationToken || "");

      const result = await saveWebhookSettings(formData);

      if (result.success) {
        toast.success("Webhook settings saved", {
          description: "Configuration has been updated successfully",
        });
        router.refresh();
      } else {
        toast.error("Failed to save settings", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    try {
      const result = await testWebhook();
      if (result.success) {
        toast.success("Test successful!", {
          description: result.message,
        });
        router.refresh();
      } else {
        toast.error("Test failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Test failed");
    } finally {
      setIsTesting(false);
    }
  }

  async function handleClearEvents() {
    setIsClearing(true);
    try {
      const result = await clearWebhookEvents();
      if (result.success) {
        toast.success("Events cleared", {
          description: "All webhook events have been removed",
        });
        router.refresh();
      } else {
        toast.error("Failed to clear events", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-xs font-medium uppercase">
                  Enable Webhook
                </FormLabel>
                <FormDescription className="text-xs">
                  Allow Milesight to send events to this endpoint
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="webhookUuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase">
                Webhook UUID
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="From Milesight webhook configuration"
                  className="text-sm font-mono"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                UUID provided by Milesight for webhook identification
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="webhookSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase">
                Webhook Secret
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="From Milesight webhook configuration"
                  className="text-sm font-mono"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Secret key provided by Milesight for signature verification
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="verificationToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase">
                Verification Token (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="your-custom-token (optional)"
                  className="text-sm font-mono"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Optional additional token you can define for extra security
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4">
          <Button type="submit" disabled={isLoading} size="sm" className="text-xs">
            <FaSave className="mr-2 h-3 w-3" />
            {isLoading ? "SAVING..." : "SAVE SETTINGS"}
          </Button>

          {initialSettings && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleTest}
                disabled={isTesting}
              >
                <FaPlug className="mr-2 h-3 w-3 text-blue-500" />
                {isTesting ? "TESTING..." : "TEST WEBHOOK"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                  >
                    <FaTrash className="mr-2 h-3 w-3" />
                    CLEAR EVENTS
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base">
                      Clear all webhook events?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                      This will delete all stored webhook events from the database.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearEvents}
                      disabled={isClearing}
                      className="text-xs"
                    >
                      {isClearing ? "Clearing..." : "Clear Events"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>


        {/* Test Status */}
        {initialSettings?.lastTestAt && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium">Last Test:</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(initialSettings.lastTestAt)} -{" "}
              <span
                className={
                  initialSettings.lastTestStatus === "SUCCESS"
                    ? "font-medium text-green-500"
                    : "font-medium text-red-500"
                }
              >
                {initialSettings.lastTestStatus}
              </span>
            </p>
            {initialSettings.lastError && (
              <p className="mt-1 text-xs text-destructive">
                Error: {initialSettings.lastError}
              </p>
            )}
          </div>
        )}
      </form>
    </Form>
  );
}

