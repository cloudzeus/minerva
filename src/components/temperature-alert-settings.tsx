"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaThermometerHalf, FaEnvelope, FaPlus, FaTimes, FaBell, FaSave } from "react-icons/fa";
import { toast } from "sonner";
import { saveTemperatureAlert, deleteTemperatureAlert, setTemperatureAlertEnabled } from "@/app/actions/temperature-alerts";
import { Switch } from "@/components/ui/switch";

/** Normalize from API (string[] or { email, enabled }[]) to form state */
function normalizeRecipients(
  raw: string[] | { email: string; enabled?: boolean }[] | undefined
): { email: string; enabled: boolean }[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [{ email: "", enabled: true }];
  return raw.map((r) =>
    typeof r === "string"
      ? { email: r, enabled: true }
      : { email: r.email || "", enabled: r.enabled !== false }
  );
}

interface TemperatureAlertSettingsProps {
  deviceId: string;
  deviceName: string;
  deviceType?: string | null;
  initialSettings?: {
    sensorChannel?: string | null;
    minTemperature: number;
    maxTemperature: number;
    emailRecipients: string[] | { email: string; enabled?: boolean }[];
    enabled: boolean;
    alertCooldown: number;
  } | null;
  initialSettingsCH1?: {
    sensorChannel?: string | null;
    minTemperature: number;
    maxTemperature: number;
    emailRecipients: string[] | { email: string; enabled?: boolean }[];
    enabled: boolean;
    alertCooldown: number;
  } | null;
  initialSettingsCH2?: {
    sensorChannel?: string | null;
    minTemperature: number;
    maxTemperature: number;
    emailRecipients: string[] | { email: string; enabled?: boolean }[];
    enabled: boolean;
    alertCooldown: number;
  } | null;
}

interface AlertFormState {
  minTemp: number;
  maxTemp: number;
  enabled: boolean;
  cooldown: number;
  emailRecipients: { email: string; enabled: boolean }[];
}

export function TemperatureAlertSettings({
  deviceId,
  deviceName,
  deviceType,
  initialSettings,
  initialSettingsCH1,
  initialSettingsCH2,
}: TemperatureAlertSettingsProps) {
  const isTS302 = deviceType?.toUpperCase().includes("TS302") || deviceType?.toUpperCase().includes("TS-302");
  
  // Single sensor (TS301 or other)
  const [singleAlert, setSingleAlert] = useState<AlertFormState>({
    minTemp: initialSettings?.minTemperature ?? 0,
    maxTemp: initialSettings?.maxTemperature ?? 30,
    enabled: initialSettings?.enabled ?? true,
    cooldown: initialSettings?.alertCooldown ?? 300,
    emailRecipients: normalizeRecipients(initialSettings?.emailRecipients),
  });

  // CH1 settings (TS302)
  const [ch1Alert, setCh1Alert] = useState<AlertFormState>({
    minTemp: initialSettingsCH1?.minTemperature ?? 0,
    maxTemp: initialSettingsCH1?.maxTemperature ?? 30,
    enabled: initialSettingsCH1?.enabled ?? true,
    cooldown: initialSettingsCH1?.alertCooldown ?? 300,
    emailRecipients: normalizeRecipients(initialSettingsCH1?.emailRecipients),
  });

  // CH2 settings (TS302)
  const [ch2Alert, setCh2Alert] = useState<AlertFormState>({
    minTemp: initialSettingsCH2?.minTemperature ?? 0,
    maxTemp: initialSettingsCH2?.maxTemperature ?? 30,
    enabled: initialSettingsCH2?.enabled ?? true,
    cooldown: initialSettingsCH2?.alertCooldown ?? 300,
    emailRecipients: normalizeRecipients(initialSettingsCH2?.emailRecipients),
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [togglingEnabled, setTogglingEnabled] = useState<string | null>(null); // "single" | "CH1" | "CH2"

  const handleSave = async (channel?: "CH1" | "CH2" | null) => {
    setIsSaving(true);

    try {
      const alert = channel === "CH1" ? ch1Alert : channel === "CH2" ? ch2Alert : singleAlert;
      
      const result = await saveTemperatureAlert({
        deviceId,
        deviceName,
        sensorChannel: channel || null,
        minTemperature: alert.minTemp,
        maxTemperature: alert.maxTemp,
        emailRecipients: alert.emailRecipients,
        enabled: alert.enabled,
        alertCooldown: alert.cooldown,
      });

      if (result.success) {
        toast.success("Alert settings saved", {
          description: `Temperature alerts configured for ${channel || "device"} on ${deviceName}`,
        });
      } else {
        toast.error("Failed to save settings", {
          description: result.error,
        });
      }
    } catch (error: any) {
      toast.error("Error saving settings", {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (isTS302) {
        await Promise.all([
          handleSave("CH1"),
          handleSave("CH2"),
        ]);
        toast.success("All alert settings saved", {
          description: `Temperature alerts configured for CH1 and CH2 on ${deviceName}`,
        });
      } else {
        await handleSave(null);
      }
    } catch (error: any) {
      toast.error("Error saving settings", {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnabledToggle = async (
    channel: "CH1" | "CH2" | null,
    checked: boolean
  ) => {
    const key = channel ?? "single";
    const alert = channel === "CH1" ? ch1Alert : channel === "CH2" ? ch2Alert : singleAlert;
    const setAlert = channel === "CH1" ? setCh1Alert : channel === "CH2" ? setCh2Alert : setSingleAlert;
    const hasExisting = channel === "CH1" ? !!initialSettingsCH1 : channel === "CH2" ? !!initialSettingsCH2 : !!initialSettings;

    const previousEnabled = alert.enabled;
    setAlert({ ...alert, enabled: checked });

    if (!hasExisting) {
      // No saved alert yet; just update local state. Will persist when user clicks Save.
      return;
    }

    setTogglingEnabled(key);
    try {
      const result = await setTemperatureAlertEnabled(deviceId, channel, checked);
      if (result.success) {
        toast.success(
          checked ? "Notifications enabled" : "Notifications disabled",
          {
            description: `Temperature alerts ${checked ? "on" : "off"} for ${channel || "this device"} on ${deviceName}`,
          }
        );
      } else {
        setAlert({ ...alert, enabled: previousEnabled });
        toast.error(result.error ?? "Failed to update notifications");
      }
    } catch (error: any) {
      setAlert({ ...alert, enabled: previousEnabled });
      toast.error("Failed to update notifications", {
        description: error.message,
      });
    } finally {
      setTogglingEnabled(null);
    }
  };

  const handleDelete = async (channel?: "CH1" | "CH2" | null) => {
    const confirmMessage = channel 
      ? `Are you sure you want to delete the ${channel} temperature alert?`
      : "Are you sure you want to delete this temperature alert?";
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(channel || "single");

    try {
      const result = await deleteTemperatureAlert(deviceId, channel || null);

      if (result.success) {
        toast.success("Alert deleted", {
          description: `Temperature alert settings removed for ${channel || "device"}`,
        });
        // Reset to defaults
        if (channel === "CH1") {
          setCh1Alert({
            minTemp: 0,
            maxTemp: 30,
            enabled: true,
            cooldown: 300,
            emailRecipients: [{ email: "", enabled: true }],
          });
        } else if (channel === "CH2") {
          setCh2Alert({
            minTemp: 0,
            maxTemp: 30,
            enabled: true,
            cooldown: 300,
            emailRecipients: [{ email: "", enabled: true }],
          });
        } else {
          setSingleAlert({
            minTemp: 0,
            maxTemp: 30,
            enabled: true,
            cooldown: 300,
            emailRecipients: [{ email: "", enabled: true }],
          });
        }
      } else {
        toast.error("Failed to delete alert", {
          description: result.error,
        });
      }
    } catch (error: any) {
      toast.error("Error deleting alert", {
        description: error.message,
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderAlertForm = (
    alert: AlertFormState,
    setAlert: (alert: AlertFormState) => void,
    channel?: "CH1" | "CH2" | null,
    hasInitialSettings?: boolean
  ) => {
    const channelLabel = channel === "CH1" ? "CH1" : channel === "CH2" ? "CH2" : "";
    const channelName = channelLabel ? ` (${channelLabel})` : "";

    return (
      <div className="space-y-4">
        {/* Temperature Range */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`minTemp${channelLabel}`} className="text-xs font-semibold">
              <FaThermometerHalf className="mr-1 inline h-3 w-3 text-blue-500" />
              Minimum Temperature (°C)
            </Label>
            <Input
              id={`minTemp${channelLabel}`}
              type="number"
              step="0.1"
              value={alert.minTemp}
              onChange={(e) => setAlert({ ...alert, minTemp: parseFloat(e.target.value) || 0 })}
              placeholder="-20"
              className="text-sm"
              min={-100}
              max={100}
            />
            <p className="text-xs text-muted-foreground">
              Alert when temperature drops below this value
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`maxTemp${channelLabel}`} className="text-xs font-semibold">
              <FaThermometerHalf className="mr-1 inline h-3 w-3 text-red-500" />
              Maximum Temperature (°C)
            </Label>
            <Input
              id={`maxTemp${channelLabel}`}
              type="number"
              step="0.1"
              value={alert.maxTemp}
              onChange={(e) => setAlert({ ...alert, maxTemp: parseFloat(e.target.value) || 30 })}
              placeholder="30"
              className="text-sm"
              min={-100}
              max={100}
            />
            <p className="text-xs text-muted-foreground">
              Alert when temperature rises above this value
            </p>
          </div>
        </div>

        {/* Temperature Range Display */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            Alert will trigger if temperature goes{" "}
            <strong className="text-blue-600">below {alert.minTemp}°C</strong> or{" "}
            <strong className="text-red-600">above {alert.maxTemp}°C</strong>
            {channelLabel && ` for ${channelLabel}`}
          </p>
        </div>

        {/* Cooldown Period */}
        <div className="space-y-2">
          <Label htmlFor={`cooldown${channelLabel}`} className="text-xs">
            Alert Cooldown (seconds)
          </Label>
          <Input
            id={`cooldown${channelLabel}`}
            type="number"
            step="60"
            value={alert.cooldown}
            onChange={(e) => setAlert({ ...alert, cooldown: parseInt(e.target.value) || 300 })}
            placeholder="300"
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Minimum time between consecutive alerts: {Math.floor(alert.cooldown / 60)} minutes
          </p>
        </div>

        {/* Email Recipients */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">
            <FaEnvelope className="mr-1 inline h-3 w-3 text-blue-600" />
            Email Recipients for Alerts{channelName}
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Add email addresses and use the switch to enable or disable notifications per recipient
          </p>

          <div className="space-y-2">
            {alert.emailRecipients.map((recipient, index) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <Input
                  type="email"
                  value={recipient.email}
                  onChange={(e) => {
                    const updated = alert.emailRecipients.map((r, i) =>
                      i === index ? { ...r, email: e.target.value } : r
                    );
                    setAlert({ ...alert, emailRecipients: updated });
                  }}
                  placeholder="engineer@company.com"
                  className="text-sm flex-1 min-w-[160px]"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor={`email-notif-${channelLabel}-${index}`} className="text-xs whitespace-nowrap">
                    Notifications
                  </Label>
                  <Switch
                    id={`email-notif-${channelLabel}-${index}`}
                    checked={recipient.enabled}
                    onCheckedChange={(checked) => {
                      const updated = alert.emailRecipients.map((r, i) =>
                        i === index ? { ...r, enabled: checked } : r
                      );
                      setAlert({ ...alert, emailRecipients: updated });
                    }}
                  />
                </div>
                {alert.emailRecipients.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setAlert({
                        ...alert,
                        emailRecipients: alert.emailRecipients.filter((_, i) => i !== index),
                      });
                    }}
                    title="Remove this recipient"
                  >
                    <FaTimes className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setAlert({
                ...alert,
                emailRecipients: [...alert.emailRecipients, { email: "", enabled: true }],
              })
            }
            className="w-full text-xs"
          >
            <FaPlus className="mr-2 h-3 w-3" />
            Add Another Recipient
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => handleSave(channel || null)}
            disabled={isSaving}
            className="flex-1 text-xs"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <FaSave className="mr-2 h-3 w-3" />
                Save {channelLabel} Alert Settings
              </>
            )}
          </Button>

          {hasInitialSettings && (
            <Button
              onClick={() => handleDelete(channel || null)}
              disabled={isDeleting === (channel || "single")}
              variant="destructive"
              className="text-xs"
            >
              {isDeleting === (channel || "single") ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isTS302) {
    // TS302: Show two separate alert cards for CH1 and CH2
    return (
      <div className="space-y-4">
        {/* CH1 Alert Card */}
        <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#dbffcc' }}>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FaBell className="h-4 w-4 text-orange-600" />
                  Temperature Alert Settings - CH1
                </CardTitle>
                <CardDescription className="text-xs">
                  Get email notifications when CH1 temperature goes out of range
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="alert-enabled-ch1" className="text-xs">
                  Notifications {ch1Alert.enabled ? "on" : "off"}
                </Label>
                <Switch
                  id="alert-enabled-ch1"
                  checked={ch1Alert.enabled}
                  onCheckedChange={(checked) => handleEnabledToggle("CH1", checked)}
                  disabled={togglingEnabled === "CH1"}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {renderAlertForm(ch1Alert, setCh1Alert, "CH1", !!initialSettingsCH1)}
          </CardContent>
        </Card>

        {/* CH2 Alert Card */}
        <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#dbffcc' }}>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FaBell className="h-4 w-4 text-orange-600" />
                  Temperature Alert Settings - CH2
                </CardTitle>
                <CardDescription className="text-xs">
                  Get email notifications when CH2 temperature goes out of range
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="alert-enabled-ch2" className="text-xs">
                  Notifications {ch2Alert.enabled ? "on" : "off"}
                </Label>
                <Switch
                  id="alert-enabled-ch2"
                  checked={ch2Alert.enabled}
                  onCheckedChange={(checked) => handleEnabledToggle("CH2", checked)}
                  disabled={togglingEnabled === "CH2"}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {renderAlertForm(ch2Alert, setCh2Alert, "CH2", !!initialSettingsCH2)}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Single sensor (TS301 or other): Show one alert card
  return (
    <Card className="border-border/40 shadow-sm" style={{ backgroundColor: '#dbffcc' }}>
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FaBell className="h-4 w-4 text-orange-600" />
              Temperature Alert Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Get email notifications when temperature goes out of range
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="alert-enabled" className="text-xs">
              Notifications {singleAlert.enabled ? "on" : "off"}
            </Label>
            <Switch
              id="alert-enabled"
              checked={singleAlert.enabled}
              onCheckedChange={(checked) => handleEnabledToggle(null, checked)}
              disabled={togglingEnabled === "single"}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {renderAlertForm(singleAlert, setSingleAlert, null, !!initialSettings)}
      </CardContent>
    </Card>
  );
}
