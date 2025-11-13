"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

export async function debugDeviceCache() {
  await requireRole(Role.ADMIN);

  const devices = await prisma.milesightDeviceCache.findMany({
    select: {
      id: true,
      deviceId: true,
      name: true,
      sn: true,
    },
  });

  console.log("=".repeat(80));
  console.log("[DEBUG] Devices in Cache:");
  console.log("=".repeat(80));
  console.log("Total devices:", devices.length);
  
  devices.forEach((device, index) => {
    console.log(`\n[${index + 1}] Device:`);
    console.log("  DB ID:", device.id);
    console.log("  Device ID:", device.deviceId);
    console.log("  Device ID (type):", typeof device.deviceId);
    console.log("  Device ID (length):", device.deviceId.length);
    console.log("  Name:", device.name);
    console.log("  SN:", device.sn);
  });
  
  console.log("=".repeat(80));
  
  // Check for the specific device from webhook
  const webhookDeviceId = "1988618061618307000";
  console.log("\n[DEBUG] Looking for webhook device:", webhookDeviceId);
  
  const found = await prisma.milesightDeviceCache.findUnique({
    where: { deviceId: webhookDeviceId },
  });
  
  console.log("Found:", !!found);
  if (found) {
    console.log("Match!", found);
  } else {
    console.log("NOT FOUND - checking if similar IDs exist...");
    const similar = devices.filter(d => 
      d.deviceId.includes("1988618") || d.sn === "6723D38552440017"
    );
    console.log("Similar devices:", similar);
  }
  
  console.log("=".repeat(80));

  return {
    totalDevices: devices.length,
    devices: devices.map(d => ({
      deviceId: d.deviceId,
      name: d.name,
      sn: d.sn,
    })),
  };
}

