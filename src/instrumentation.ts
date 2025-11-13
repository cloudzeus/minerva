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
    const { startCronJobs } = await import("@/lib/cron");
    
    console.log("\n🚀 [Instrumentation] Starting server initialization...");
    
    // Start cron jobs
    startCronJobs();
    
    console.log("✅ [Instrumentation] Server initialization complete\n");
  }
}

