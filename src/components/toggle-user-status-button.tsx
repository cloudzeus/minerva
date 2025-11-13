"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaToggleOn, FaToggleOff } from "react-icons/fa";
import { toggleUserStatus } from "@/app/actions/users";
import { toast } from "sonner";

interface ToggleUserStatusButtonProps {
  userId: string;
  isActive: boolean;
}

export function ToggleUserStatusButton({
  userId,
  isActive,
}: ToggleUserStatusButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle() {
    setIsLoading(true);
    try {
      const result = await toggleUserStatus(userId, !isActive);
      if (result.success) {
        toast.success(
          isActive ? "User deactivated" : "User activated",
          {
            description: `User status updated successfully`,
          }
        );
      } else {
        toast.error("Failed to update status", {
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
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isActive ? (
        <>
          <FaToggleOff className="mr-1 h-3 w-3 text-gray-500" />
          <span className="text-xs">DEACTIVATE</span>
        </>
      ) : (
        <>
          <FaToggleOn className="mr-1 h-3 w-3 text-green-500" />
          <span className="text-xs">ACTIVATE</span>
        </>
      )}
    </Button>
  );
}

