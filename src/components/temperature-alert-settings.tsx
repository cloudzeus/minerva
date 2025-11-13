"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaThermometerHalf, FaEnvelope, FaPlus, FaTimes, FaBell, FaSave } from "react-icons/fa";
import { toast } from "sonner";
import { saveTemperatureAlert, deleteTemperatureAlert } from "@/app/actions/temperature-alerts";
import { Switch } from "@/components/ui/switch";

interface TemperatureAlertSettingsProps {
  deviceId: string;
  deviceName: string;
  initialSettings?: {
    minTemperature: number;
    maxTemperature: number;
    emailRecipients: string[];
    enabled: boolean;
    alertCooldown: number;
  } | null;
}

export function TemperatureAlertSettings({
  deviceId,
  deviceName,
  initialSettings,
}: TemperatureAlertSettingsProps) {
  const [minTemp, setMinTemp] = useState(initialSettings?.minTemperature ?? 0);
  const [maxTemp, setMaxTemp] = useState(initialSettings?.maxTemperature ?? 30);
  const [enabled, setEnabled] = useState(initialSettings?.enabled ?? true);
  const [cooldown, setCooldown] = useState(initialSettings?.alertCooldown ?? 300);
  const [emailRecipients, setEmailRecipients] = useState<string[]>(
    initialSettings?.emailRecipients || [""]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addRecipient = () => {
    setEmailRecipients([...emailRecipients, ""]);
  };

  const removeRecipient = (index: number) => {
    setEmailRecipients(emailRecipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, value: string) => {
    const updated = [...emailRecipients];
    updated[index] = value;
    setEmailRecipients(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const result = await saveTemperatureAlert({
        deviceId,
        minTemperature: minTemp,
        maxTemperature: maxTemp,
        emailRecipients: emailRecipients.filter((e) => e.trim() !== ""),
        enabled,
        alertCooldown: cooldown,
      });

      if (result.success) {
        toast.success("Alert settings saved", {
          description: `Temperature alerts configured for ${deviceName}`,
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this temperature alert?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteTemperatureAlert(deviceId);

      if (result.success) {
        toast.success("Alert deleted", {
          description: "Temperature alert settings removed",
        });
        // Reset to defaults
        setMinTemp(0);
        setMaxTemp(30);
        setEnabled(true);
        setCooldown(300);
        setEmailRecipients([""]);
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
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm">
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
              {enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="alert-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Temperature Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minTemp" className="text-xs font-semibold">
                <FaThermometerHalf className="mr-1 inline h-3 w-3 text-blue-500" />
                Minimum Temperature (°C)
              </Label>
              <Input
                id="minTemp"
                type="number"
                step="0.1"
                value={minTemp}
                onChange={(e) => setMinTemp(parseFloat(e.target.value) || 0)}
                placeholder="-20"
                className="text-sm"
                min={-100}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Alert when temperature drops below this value (supports negative values)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTemp" className="text-xs font-semibold">
                <FaThermometerHalf className="mr-1 inline h-3 w-3 text-red-500" />
                Maximum Temperature (°C)
              </Label>
              <Input
                id="maxTemp"
                type="number"
                step="0.1"
                value={maxTemp}
                onChange={(e) => setMaxTemp(parseFloat(e.target.value) || 30)}
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
              <strong className="text-blue-600">below {minTemp}°C</strong> or{" "}
              <strong className="text-red-600">above {maxTemp}°C</strong>
            </p>
          </div>

          {/* Cooldown Period */}
          <div className="space-y-2">
            <Label htmlFor="cooldown" className="text-xs">
              Alert Cooldown (seconds)
            </Label>
            <Input
              id="cooldown"
              type="number"
              step="60"
              value={cooldown}
              onChange={(e) => setCooldown(parseInt(e.target.value))}
              placeholder="300"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Minimum time between consecutive alerts: {Math.floor(cooldown / 60)} minutes
            </p>
          </div>

          {/* Email Recipients */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              <FaEnvelope className="mr-1 inline h-3 w-3 text-blue-600" />
              Email Recipients for Alerts
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter email addresses that will receive temperature alert notifications
            </p>

            <div className="space-y-2">
              {emailRecipients.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateRecipient(index, e.target.value)}
                    placeholder="engineer@company.com"
                    className="text-sm"
                    required
                  />
                  {emailRecipients.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeRecipient(index)}
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
              onClick={addRecipient}
              className="w-full text-xs"
            >
              <FaPlus className="mr-2 h-3 w-3" />
              Add Another Recipient
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 text-xs"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <FaSave className="mr-2 h-3 w-3" />
                  Save Alert Settings
                </>
              )}
            </Button>

            {initialSettings && (
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
                className="text-xs"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

