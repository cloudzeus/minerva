import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "2000");

    const telemetryData = await prisma.milesightDeviceTelemetry.findMany({
      where: { deviceId },
      orderBy: { dataTimestamp: "desc" },
      take: limit,
    });

    return NextResponse.json(telemetryData);
  } catch (error) {
    console.error("[API] Failed to fetch telemetry:", error);
    return NextResponse.json(
      { error: "Failed to fetch telemetry data" },
      { status: 500 }
    );
  }
}

