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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase">
            Total Devices
          </CardTitle>
          <FaMicrochip className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDevices}</div>
          <p className="text-xs text-muted-foreground">Registered devices</p>
        </CardContent>
      </Card>

      {/* Online Devices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase">
            Online
          </CardTitle>
          <FaMicrochip className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{onlineDevices}</div>
          <p className="text-xs text-muted-foreground">
            {totalDevices > 0
              ? `${Math.round((onlineDevices / totalDevices) * 100)}% active`
              : "No devices"}
          </p>
        </CardContent>
      </Card>

      {/* Average Temperature */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase">
            Avg Temperature
          </CardTitle>
          <FaThermometerHalf className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {avgTemperature !== null ? `${avgTemperature.toFixed(1)}°C` : "—"}
          </div>
          <p className="text-xs text-muted-foreground">Latest readings</p>
        </CardContent>
      </Card>

      {/* Average Humidity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase">
            Avg Humidity
          </CardTitle>
          <FaTint className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {avgHumidity !== null ? `${avgHumidity.toFixed(1)}%` : "—"}
          </div>
          <p className="text-xs text-muted-foreground">Latest readings</p>
        </CardContent>
      </Card>

      {/* Average Battery */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase">
            Avg Battery
          </CardTitle>
          <FaBatteryHalf className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {avgBattery !== null ? `${Math.round(avgBattery)}%` : "—"}
          </div>
          <p className="text-xs text-muted-foreground">
            {avgBattery !== null && avgBattery < 20
              ? "Low battery!"
              : "All devices"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

