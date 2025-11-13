"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

export async function debugMilesightSettings() {
  await requireRole(Role.ADMIN);

  const settings = await prisma.milesightSettings.findFirst();

  console.log("=".repeat(80));
  console.log("[DEBUG] Milesight Settings in Database:");
  console.log("=".repeat(80));
  console.log("Settings exists:", !!settings);
  
  if (settings) {
    console.log("ID:", settings.id);
    console.log("Name:", settings.name);
    console.log("Enabled:", settings.enabled);
    console.log("Base URL:", settings.baseUrl);
    console.log("Client ID:", settings.clientId);
    console.log("Client Secret length:", settings.clientSecret?.length || 0);
    console.log("Has Access Token:", !!settings.accessToken);
    console.log("Access Token length:", settings.accessToken?.length || 0);
    console.log("Access Token preview:", settings.accessToken?.substring(0, 30) + "...");
    console.log("Has Refresh Token:", !!settings.refreshToken);
    console.log("Access Token Expires At:", settings.accessTokenExpiresAt);
    console.log("Refresh Token Expires At:", settings.refreshTokenExpiresAt);
    console.log("Created At:", settings.createdAt);
    console.log("Updated At:", settings.updatedAt);
  }
  
  console.log("=".repeat(80));

  return {
    exists: !!settings,
    hasAccessToken: !!settings?.accessToken,
    expiresAt: settings?.accessTokenExpiresAt?.toISOString() || null,
  };
}

