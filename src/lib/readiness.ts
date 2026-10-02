export const liveVariables = ["SANITY_STUDIO_PROJECT_ID", "SANITY_READ_TOKEN", "SANITY_WRITE_TOKEN", "GOOGLE_GENERATIVE_AI_API_KEY", "CURATOR_ACCESS_CODE"] as const;

export function inspectConfiguration(environment: Record<string, string | undefined> = process.env) {
  const missing = liveVariables.filter((name) => !environment[name]?.trim() || /^(YOUR_|CHOOSE_|REPLACE_)/i.test(environment[name]!.trim()));
  const issues: string[] = [];
  if (environment.APP_MODE !== "live") issues.push("Set APP_MODE=live after configuring the required services.");
  if (environment.CURATOR_ACCESS_CODE && environment.CURATOR_ACCESS_CODE.length < 24) issues.push("Use a CURATOR_ACCESS_CODE of at least 24 characters.");
  if (environment.APP_URL) {
    try { applicationOrigin(environment.APP_URL); } catch { issues.push("APP_URL must be an HTTPS origin or a localhost HTTP origin without a path, query, or credentials."); }
  }
  return { configured: missing.length === 0 && issues.length === 0, missing, issues, liveVerified: false };
}

export function applicationOrigin(value: string): string {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(loopback && url.protocol === "http:")) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("APP_URL must be your HTTPS application origin or a localhost HTTP origin, without credentials, path, query, or fragment.");
  }
  return url.origin;
}