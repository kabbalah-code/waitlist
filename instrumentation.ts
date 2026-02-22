export async function register() {
  // Sentry disabled for development
  console.log("[Instrumentation] Sentry disabled")
  return
  
  // Commented out to avoid build errors when Sentry configs are missing
  // if (process.env.NEXT_RUNTIME === "nodejs") {
  //   await import("./sentry.server.config")
  // }

  // if (process.env.NEXT_RUNTIME === "edge") {
  //   await import("./sentry.edge.config")
  // }
}


