"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaCopy, FaCheck } from "react-icons/fa";
import { toast } from "sonner";

interface CopyFieldProps {
  label: string;
  value: string;
  description?: string;
}

export function CopyField({ label, value, description }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-1 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <FaCheck className="mr-1 h-3 w-3 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <FaCopy className="mr-1 h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <code className="block break-all text-xs font-mono text-muted-foreground">
        {value}
      </code>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

