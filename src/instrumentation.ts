/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Node.js server starts.
 * Used to initialize services like cron jobs, monitoring, etc.
 * 
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side (not in edge runtime or client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      console.log("\n🚀 [Instrumentation] Starting server initialization...");
      
      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        console.warn("⚠️ [Instrumentation] DATABASE_URL not configured. Cron jobs will not start.");
        console.log("✅ [Instrumentation] Server initialization complete (without cron jobs)\n");
        return;
      }
      
      const { startCronJobs } = await import("@/lib/cron");
      
      // Start cron jobs with error handling
      try {
        startCronJobs();
        console.log("✅ [Instrumentation] Cron jobs started successfully");
      } catch (cronError: any) {
        console.error("❌ [Instrumentation] Failed to start cron jobs:", cronError);
        console.error("❌ [Instrumentation] Error details:", cronError.message);
        // Don't throw - allow server to start even if cron jobs fail
      }
      
      console.log("✅ [Instrumentation] Server initialization complete\n");
    } catch (error: any) {
      console.error("❌ [Instrumentation] Server initialization failed:", error);
      console.error("❌ [Instrumentation] Error details:", error.message);
      console.error("❌ [Instrumentation] Stack:", error.stack);
      // Don't throw - allow server to start even if instrumentation fails
      console.log("⚠️ [Instrumentation] Server will continue without instrumentation features\n");
    }
  }
}

