"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTestEmailAction } from "@/app/actions/test-email";
import { toast } from "sonner";
import { FaPaperPlane } from "react-icons/fa";

interface EmailTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailTestModal({ open, onOpenChange }: EmailTestModalProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleTest() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter a recipient email address");
      return;
    }
    setIsSending(true);
    try {
      const result = await sendTestEmailAction(trimmed);
      if (result.success) {
        toast.success("Test email sent", {
          description: result.message,
        });
        onOpenChange(false);
        setEmail("");
      } else {
        toast.error("Failed to send test email", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm uppercase">Send test email</DialogTitle>
          <DialogDescription className="text-xs">
            Enter a recipient address. A test message will be sent using the configured SMTP (nodemailer).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="email-test-recipient" className="text-[9px] uppercase font-medium">
              Recipient email
            </Label>
            <Input
              id="email-test-recipient"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-7 px-2.5 py-1 text-[9px] rounded-md"
              disabled={isSending}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleTest}
              disabled={isSending}
              className="h-7 px-3 text-[10px] gap-1"
            >
              <FaPaperPlane className="h-3 w-3" />
              {isSending ? "Sending…" : "Test"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
