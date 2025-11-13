/**
 * Milesight Development Platform OAuth2 Integration
 * 
 * Documentation: https://milesight-development-platform.readme.io/
 * 
 * This module handles:
 * - OAuth2 client_credentials flow
 * - Token refresh mechanism
 * - Secure token storage
 */

interface MilesightTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  token_type: string;
}

interface MilesightConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Request new access token using client_credentials grant
 * 
 * Milesight API Endpoint: {baseUrl}/oauth/token
 * Example: https://eu-openapi.milesight.com/oauth/token
 * 
 * Format: application/x-www-form-urlencoded
 */
export async function requestMilesightToken(
  config: MilesightConfig
): Promise<MilesightTokenResponse> {
  // Correct Milesight endpoint format: /oauth/token
  const tokenUrl = `${config.baseUrl}/oauth/token`;

  console.log("[Milesight] Requesting token from:", tokenUrl);
  console.log("[Milesight] Client ID:", config.clientId);

  try {
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    console.log("[Milesight] Response status:", response.status);
    console.log("[Milesight] Response body:", responseText);

    if (!response.ok) {
      throw new Error(
        `Milesight API returned ${response.status}: ${responseText}`
      );
    }

    const data = JSON.parse(responseText);
    
    // Milesight wraps response in a "data" object
    const tokenData = data.data || data;
    
    // Handle both snake_case and camelCase
    if (tokenData.access_token || tokenData.accessToken) {
      console.log("[Milesight] Token parsed successfully");
      return {
        access_token: tokenData.access_token || tokenData.accessToken,
        refresh_token: tokenData.refresh_token || tokenData.refreshToken,
        expires_in: tokenData.expires_in || tokenData.expiresIn || 3600,
        token_type: tokenData.token_type || tokenData.tokenType || "Bearer",
      };
    }

    throw new Error(`Invalid token response format: ${responseText}`);
  } catch (error: any) {
    console.error("[Milesight] Token request failed:", error);
    throw new Error(
      `Failed to get token: ${error.message}`
    );
  }
}

/**
 * Refresh access token using refresh_token grant
 */
export async function refreshMilesightToken(
  config: MilesightConfig,
  refreshToken: string
): Promise<MilesightTokenResponse> {
  const tokenUrl = `${config.baseUrl}/oauth/token`;

  console.log("[Milesight] Refreshing token from:", tokenUrl);

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const responseText = await response.text();
  console.log("[Milesight] Refresh response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(
      `Milesight token refresh failed (${response.status}): ${responseText}`
    );
  }

  const data = JSON.parse(responseText);
  
  // Milesight wraps response in a "data" object
  const tokenData = data.data || data;
  
  return {
    access_token: tokenData.access_token || tokenData.accessToken,
    refresh_token: tokenData.refresh_token || tokenData.refreshToken,
    expires_in: tokenData.expires_in || tokenData.expiresIn || 3600,
    token_type: tokenData.token_type || tokenData.tokenType || "Bearer",
  };
}

/**
 * Verify if token is valid by making a test API call
 */
export async function verifyMilesightToken(
  baseUrl: string,
  accessToken: string
): Promise<boolean> {
  try {
    // Test the token with a simple API call (e.g., get user info or organization info)
    const response = await fetch(`${baseUrl}/uc/account/api/v1/account/info`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Calculate token expiry datetime
 */
export function calculateTokenExpiry(expiresInSeconds: number): Date {
  return new Date(Date.now() + expiresInSeconds * 1000);
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return expiresAt <= fiveMinutesFromNow;
}

/**
 * Get connection status based on token availability and expiry
 */
export function getMilesightConnectionStatus(
  accessToken: string | null,
  accessTokenExpiresAt: Date | null
): {
  connected: boolean;
  status: "connected" | "expired" | "disconnected";
  statusLabel: string;
  statusColor: string;
} {
  if (!accessToken) {
    return {
      connected: false,
      status: "disconnected",
      statusLabel: "Not Connected",
      statusColor: "text-gray-500",
    };
  }

  if (isTokenExpired(accessTokenExpiresAt)) {
    return {
      connected: false,
      status: "expired",
      statusLabel: "Token Expired",
      statusColor: "text-yellow-500",
    };
  }

  return {
    connected: true,
    status: "connected",
    statusLabel: "Connected",
    statusColor: "text-green-500",
  };
}

