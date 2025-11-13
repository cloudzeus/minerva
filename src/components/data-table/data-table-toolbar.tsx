"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaChevronDown, FaFileExcel } from "react-icons/fa";

interface DataTableToolbarProps {
  selectedCount: number;
  onBulkAction?: (action: string) => void;
  onExport?: () => void;
  bulkActionItems?: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
    variant?: "default" | "destructive";
  }>;
}

export function DataTableToolbar({
  selectedCount,
  onBulkAction,
  onExport,
  bulkActionItems = [],
}: DataTableToolbarProps) {
  if (selectedCount === 0 && !onExport) return null;

  return (
    <div className="flex items-center gap-2">
      {selectedCount > 0 && bulkActionItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              Bulk Actions
              <FaChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {bulkActionItems.map((item, index) => (
              <div key={item.value}>
                {index > 0 && item.variant === "destructive" && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  className={`text-xs ${
                    item.variant === "destructive"
                      ? "text-destructive focus:text-destructive"
                      : ""
                  }`}
                  onClick={() => onBulkAction?.(item.value)}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {onExport && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onExport}
        >
          <FaFileExcel className="mr-2 h-3 w-3 text-green-600" />
          Export to Excel
        </Button>
      )}
    </div>
  );
}

