import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon | IconType;
  iconColor?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary",
}: StatsCardProps) {
  return (
    <Card className="border-border/40 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: '#dbffcc' }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[9px] font-medium uppercase text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-3 w-3 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

