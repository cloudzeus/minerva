import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaMicrochip, FaThermometerHalf, FaTint, FaBatteryHalf } from "react-icons/fa";

interface DeviceStatsCardsProps {
  totalDevices: number;
  onlineDevices: number;
  avgTemperature: number | null;
  avgHumidity: number | null;
  avgBattery: number | null;
}

export function DeviceStatsCards({
  totalDevices,
  onlineDevices,
  avgTemperature,
  avgHumidity,
  avgBattery,
}: DeviceStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total Devices */}
      <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Total Devices
          </CardTitle>
          <FaMicrochip className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{totalDevices}</div>
          <p className="mt-1 text-xs text-muted-foreground">Registered devices</p>
        </CardContent>
      </Card>

      {/* Online Devices */}
      <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Online
          </CardTitle>
          <FaMicrochip className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{onlineDevices}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalDevices > 0
              ? `${Math.round((onlineDevices / totalDevices) * 100)}% active`
              : "No devices"}
          </p>
        </CardContent>
      </Card>

      {/* Average Temperature */}
      <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Avg Temperature
          </CardTitle>
          <FaThermometerHalf className="h-3.5 w-3.5 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {avgTemperature !== null ? `${avgTemperature.toFixed(1)}°C` : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Latest readings</p>
        </CardContent>
      </Card>

      {/* Average Humidity */}
      <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Avg Humidity
          </CardTitle>
          <FaTint className="h-3.5 w-3.5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {avgHumidity !== null ? `${avgHumidity.toFixed(1)}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Latest readings</p>
        </CardContent>
      </Card>

      {/* Average Battery */}
      <Card className="border-border/40 bg-card/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Avg Battery
          </CardTitle>
          <FaBatteryHalf className="h-3.5 w-3.5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {avgBattery !== null ? `${Math.round(avgBattery)}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {avgBattery !== null && avgBattery < 20
              ? "Low battery!"
              : "All devices"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
