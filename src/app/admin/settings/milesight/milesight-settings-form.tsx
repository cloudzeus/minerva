"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  saveMilesightSettings,
  testMilesightConnection,
  refreshMilesightAccessToken,
  disconnectMilesight,
} from "@/app/actions/milesight";
import { toast } from "sonner";
import {
  FaSave,
  FaPlug,
  FaSync,
  FaCheckCircle,
  FaEyeSlash,
  FaEye,
} from "react-icons/fa";
import {
  milesightSettingsSchema,
  type MilesightSettingsFormData,
} from "@/lib/milesight-schema";
import { MilesightSettings } from "@prisma/client";
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

interface MilesightSettingsFormProps {
  initialSettings: (MilesightSettings & { clientSecret: string }) | null;
}

export function MilesightSettingsForm({
  initialSettings,
}: MilesightSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const form = useForm<MilesightSettingsFormData>({
    resolver: zodResolver(milesightSettingsSchema),
    defaultValues: {
      name: initialSettings?.name || "Default Milesight App",
      enabled: initialSettings?.enabled ?? true,
      baseUrl: initialSettings?.baseUrl || "",
      clientId: initialSettings?.clientId || "",
      clientSecret: initialSettings?.clientSecret || "",
    },
  });

  async function onSubmit(values: MilesightSettingsFormData) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("enabled", values.enabled.toString());
      formData.append("baseUrl", values.baseUrl);
      formData.append("clientId", values.clientId);
      formData.append("clientSecret", values.clientSecret);

      const result = await saveMilesightSettings(formData);

      if (result.success) {
        toast.success("Settings saved successfully", {
          description: "Milesight credentials have been updated and token requested",
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

  async function onSubmitSkipToken(values: MilesightSettingsFormData) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("enabled", values.enabled.toString());
      formData.append("baseUrl", values.baseUrl);
      formData.append("clientId", values.clientId);
      formData.append("clientSecret", values.clientSecret);
      formData.append("skipTokenRequest", "true");

      const result = await saveMilesightSettings(formData);

      if (result.success) {
        toast.success("Settings saved successfully", {
          description: "Credentials saved. Use 'Refresh Token' to request access token.",
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

  async function handleTestConnection() {
    setIsTesting(true);
    try {
      const result = await testMilesightConnection();
      if (result.success) {
        toast.success("Connection successful!", {
          description: result.message,
        });
      } else {
        toast.error("Connection failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  }

  async function handleRefreshToken() {
    setIsRefreshing(true);
    try {
      const result = await refreshMilesightAccessToken();
      if (result.success) {
        toast.success("Token refreshed", {
          description: result.message,
        });
        router.refresh();
      } else {
        toast.error("Failed to refresh token", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleDisconnect() {
    try {
      const result = await disconnectMilesight();
      if (result.success) {
        toast.success("Disconnected", {
          description: result.message,
        });
        router.refresh();
      } else {
        toast.error("Failed to disconnect", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase">Application Name</FormLabel>
              <FormControl>
                <Input placeholder="My Milesight App" className="text-sm" {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                A friendly name for this integration
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-xs font-medium uppercase">
                  Enable Integration
                </FormLabel>
                <FormDescription className="text-xs">
                  Allow this application to connect to Milesight platform
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
          name="baseUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase">Base URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://eu-openapi.milesight.com"
                  className="text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Milesight API base URL for your region (EU, US, etc.) - no trailing slash
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase">Client ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="your-client-id"
                  className="text-sm font-mono"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                OAuth2 Client ID from Milesight application settings
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase">Client Secret</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showSecret ? "text" : "password"}
                    placeholder="your-client-secret"
                    className="pr-10 text-sm font-mono"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? (
                    <FaEyeSlash className="h-4 w-4" />
                  ) : (
                    <FaEye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FormDescription className="text-xs">
                OAuth2 Client Secret (stored securely, never sent to browser)
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button 
              type="button" 
              disabled={isLoading} 
              size="sm" 
              className="text-xs"
              onClick={form.handleSubmit(onSubmit)}
            >
              <FaSave className="mr-2 h-3 w-3" />
              {isLoading ? "SAVING..." : "SAVE & CONNECT"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={form.handleSubmit(onSubmitSkipToken)}
              disabled={isLoading}
            >
              <FaSave className="mr-2 h-3 w-3" />
              SAVE ONLY
            </Button>

          {initialSettings?.accessToken && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                <FaCheckCircle className="mr-2 h-3 w-3 text-green-500" />
                {isTesting ? "TESTING..." : "TEST CONNECTION"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleRefreshToken}
                disabled={isRefreshing}
              >
                <FaSync className="mr-2 h-3 w-3 text-blue-500" />
                {isRefreshing ? "REFRESHING..." : "REFRESH TOKEN"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                  >
                    <FaPlug className="mr-2 h-3 w-3" />
                    DISCONNECT
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base">
                      Disconnect from Milesight?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                      This will clear all stored tokens. You can reconnect anytime
                      by saving the settings again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      className="text-xs"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          </div>
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Use "SAVE ONLY" to save credentials without connecting, 
            then use "REFRESH TOKEN" button to test the connection.
          </p>
        </div>

        {/* Token Information (if connected) */}
        {initialSettings?.accessToken && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm uppercase">TOKEN INFORMATION</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Access Token:</span>
                <span className="font-mono">
                  {initialSettings.accessToken.substring(0, 20)}...
                </span>
              </div>
              {initialSettings.refreshToken && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Refresh Token:</span>
                  <span className="font-mono">
                    {initialSettings.refreshToken.substring(0, 20)}...
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Expires At:</span>
                <span>
                  {initialSettings.accessTokenExpiresAt
                    ? formatDateTime(initialSettings.accessTokenExpiresAt)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-500">
                  Connected
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}

