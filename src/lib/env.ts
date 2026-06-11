import { DEFAULT_ALLOWED_TELEGRAM_IDS } from "./participants";

export function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAllowedTelegramIds() {
  return (
    getOptionalEnv("ALLOWED_TELEGRAM_IDS")?.split(",").map((id) => id.trim()) ??
    DEFAULT_ALLOWED_TELEGRAM_IDS
  ).filter(Boolean);
}

export function getSupabaseServiceRoleKey() {
  return (
    getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY") ??
    getRequiredEnv("SUPABASE_SECRET_KEY")
  );
}

export function getAppUrl() {
  const appUrl = getOptionalEnv("APP_URL");
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  const vercelUrl = getOptionalEnv("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/$/, "");
  }

  return getRequiredEnv("APP_URL");
}

export function getDailyReportSecret() {
  return getOptionalEnv("DAILY_REPORT_CRON_SECRET") ?? getOptionalEnv("CRON_SECRET");
}

export function getDailyReportSecrets() {
  return [
    getOptionalEnv("DAILY_REPORT_CRON_SECRET"),
    getOptionalEnv("CRON_SECRET"),
  ].filter(Boolean) as string[];
}
