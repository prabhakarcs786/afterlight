export function appMode(environment: Record<string, string | undefined> = process.env): "demo" | "live" {
  if (environment.NODE_ENV === "production" && !environment.APP_MODE) throw new Error("Set APP_MODE explicitly before serving a production deployment.");
  const mode = environment.APP_MODE || "demo";
  if (mode !== "demo" && mode !== "live") throw new Error("APP_MODE must be demo or live.");
  return mode;
}

export function publicConfig() {
  const mode = appMode();
  return { mode, projectId: process.env.SANITY_STUDIO_PROJECT_ID || null, generator: mode === "live" ? "model" as const : "template" as const };
}