"use server";

/**
 * Milesight Settings Server Actions
 * 
 * SECURITY: ALL actions in this file are ADMIN-ONLY
 * Every function calls requireRole(Role.ADMIN) to enforce access control
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import {
  requestMilesightToken,
  refreshMilesightToken,
  calculateTokenExpiry,
  verifyMilesightToken,
} from "@/lib/milesight";

/**
 * Get current Milesight settings
 * SECURITY: ADMIN-ONLY
 */
export async function getMilesightSettings() {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  const settings = await prisma.milesightSettings.findFirst({
    orderBy: { createdAt: "desc" },
  });

  // Never send client secret to the client
  if (settings) {
    return {
      ...settings,
      clientSecret: "••••••••", // Masked for security
    };
  }

  return null;
}

/**
 * Save or update Milesight settings and request initial token
 * SECURITY: ADMIN-ONLY
 */
export async function saveMilesightSettings(formData: FormData) {
  const currentUser = await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  const name = formData.get("name") as string;
  const enabled = formData.get("enabled") === "true";
  const baseUrl = (formData.get("baseUrl") as string).replace(/\/$/, ""); // Remove trailing slash
  const clientId = formData.get("clientId") as string;
  const clientSecret = formData.get("clientSecret") as string;
  const skipTokenRequest = formData.get("skipTokenRequest") === "true";

  try {
    // First, test the credentials by requesting a token
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let accessTokenExpiresAt: Date | null = null;
    let refreshTokenExpiresAt: Date | null = null;

    if (enabled && clientSecret !== "••••••••" && !skipTokenRequest) {
      // Only request token if enabled, secret was changed, and not skipping
      try {
        console.log("[Milesight] Attempting token request to:", `${baseUrl}/uc/account/api/oauth/token`);
        console.log("[Milesight] Client ID:", clientId);
        console.log("[Milesight] Client Secret length:", clientSecret?.length || 0);
        
        const tokenResponse = await requestMilesightToken({
          baseUrl,
          clientId,
          clientSecret,
        });

        accessToken = tokenResponse.access_token;
        refreshToken = tokenResponse.refresh_token || null;
        accessTokenExpiresAt = calculateTokenExpiry(tokenResponse.expires_in);
        
        // Refresh token typically expires in 30 days (assume 30 days if not provided)
        refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        console.log("[Milesight] Token received successfully");

        // Verify the token works (optional, may fail for some APIs)
        try {
          const isValid = await verifyMilesightToken(baseUrl, accessToken);
          if (!isValid) {
            console.warn("[Milesight] Token validation failed, but token was received");
            // Don't fail here - token might work even if validation endpoint differs
          }
        } catch (verifyError) {
          console.warn("[Milesight] Token verification skipped:", verifyError);
          // Don't fail - verification endpoint might not exist
        }
      } catch (error: any) {
        console.error("[Milesight] Token request error:", error);
        return {
          success: false,
          error: `Failed to connect to Milesight: ${error.message}\n\nTip: Check your Base URL, Client ID, and Client Secret. You can also try saving with "Skip Token Request" to save credentials first.`,
        };
      }
    }

    // Check if settings exist
    const existingSettings = await prisma.milesightSettings.findFirst();

    const settingsData = {
      name,
      enabled,
      baseUrl,
      clientId,
      clientSecret: clientSecret === "••••••••" && existingSettings
        ? existingSettings.clientSecret // Keep existing secret if masked
        : clientSecret,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      updatedByUserId: currentUser.id,
    };

    if (existingSettings) {
      await prisma.milesightSettings.update({
        where: { id: existingSettings.id },
        data: settingsData,
      });
    } else {
      await prisma.milesightSettings.create({
        data: {
          ...settingsData,
          createdByUserId: currentUser.id,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "PROFILE_UPDATED",
        description: `Updated Milesight authentication settings`,
      },
    });

    revalidatePath("/admin/settings/milesight");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to save settings",
    };
  }
}

/**
 * Manually refresh the Milesight access token
 * SECURITY: ADMIN-ONLY
 */
export async function refreshMilesightAccessToken() {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  try {
    const settings = await prisma.milesightSettings.findFirst();

    if (!settings) {
      return { success: false, error: "No Milesight settings found" };
    }

    if (!settings.refreshToken) {
      // Try to get a new token using client_credentials
      const tokenResponse = await requestMilesightToken({
        baseUrl: settings.baseUrl,
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
      });

      await prisma.milesightSettings.update({
        where: { id: settings.id },
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || null,
          accessTokenExpiresAt: calculateTokenExpiry(tokenResponse.expires_in),
          refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      revalidatePath("/admin/settings/milesight");
      return { success: true, message: "Token refreshed successfully" };
    }

    // Use refresh token
    const tokenResponse = await refreshMilesightToken(
      {
        baseUrl: settings.baseUrl,
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
      },
      settings.refreshToken
    );

    await prisma.milesightSettings.update({
      where: { id: settings.id },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || settings.refreshToken,
        accessTokenExpiresAt: calculateTokenExpiry(tokenResponse.expires_in),
      },
    });

    revalidatePath("/admin/settings/milesight");
    return { success: true, message: "Token refreshed successfully" };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to refresh token: ${error.message}`,
    };
  }
}

/**
 * Test Milesight connection
 */
export async function testMilesightConnection() {
  await requireRole(Role.ADMIN);

  try {
    const settings = await prisma.milesightSettings.findFirst();

    if (!settings || !settings.accessToken) {
      return {
        success: false,
        error: "No access token available. Please save settings first.",
      };
    }

    const isValid = await verifyMilesightToken(
      settings.baseUrl,
      settings.accessToken
    );

    if (isValid) {
      return {
        success: true,
        message: "Connection successful! Token is valid.",
      };
    } else {
      return {
        success: false,
        error: "Connection failed. Token may be expired or invalid.",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Connection test failed: ${error.message}`,
    };
  }
}

/**
 * Disconnect from Milesight (clear all tokens)
 * SECURITY: ADMIN-ONLY
 */
export async function disconnectMilesight() {
  await requireRole(Role.ADMIN); // 🔒 ADMIN ONLY

  try {
    const settings = await prisma.milesightSettings.findFirst();

    if (!settings) {
      return { success: false, error: "No settings found" };
    }

    await prisma.milesightSettings.update({
      where: { id: settings.id },
      data: {
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      },
    });

    revalidatePath("/admin/settings/milesight");
    return { success: true, message: "Disconnected successfully" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

