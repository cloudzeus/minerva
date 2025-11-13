import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaMicrochip, FaThermometerHalf, FaServer, FaCheckCircle } from "react-icons/fa";

interface DeviceStatsCardsProps {
  totalDevices: number;
  onlineDevices: number;
  avgTemperature: number | null;
  totalGateways: number;
  onlineGateways: number;
}

export function DeviceStatsCards({
  totalDevices,
  onlineDevices,
  avgTemperature,
  totalGateways,
  onlineGateways,
}: DeviceStatsCardsProps) {
  const gatewayPercentage = totalGateways > 0 ? Math.round((onlineGateways / totalGateways) * 100) : 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Devices */}
      <Card className="border-border/40 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: '#dbffcc' }}>
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
      <Card className="border-border/40 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: '#dbffcc' }}>
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
      <Card className="border-border/40 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: '#dbffcc' }}>
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

      {/* UG65 Gateway Status */}
      <Card className="border-border/40 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: '#dbffcc' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            UG65 Gateways
          </CardTitle>
          <FaServer className="h-3.5 w-3.5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold flex items-center gap-2">
            {gatewayPercentage}%
            {gatewayPercentage === 100 && totalGateways > 0 && (
              <FaCheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {onlineGateways} / {totalGateways} online
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
