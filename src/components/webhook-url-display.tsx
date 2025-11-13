"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaCopy, FaCheck } from "react-icons/fa";
import { toast } from "sonner";

interface WebhookUrlDisplayProps {
  url: string;
}

export function WebhookUrlDisplay({ url }: WebhookUrlDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Webhook URL copied to clipboard!");
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={url}
        readOnly
        className="font-mono text-xs"
        onClick={(e) => e.currentTarget.select()}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="text-xs"
      >
        {copied ? (
          <>
            <FaCheck className="mr-2 h-3 w-3 text-green-500" />
            COPIED!
          </>
        ) : (
          <>
            <FaCopy className="mr-2 h-3 w-3" />
            COPY
          </>
        )}
      </Button>
    </div>
  );
}

