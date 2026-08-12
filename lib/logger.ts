// Minimal structured logger. Writes one JSON object per line so it's easy
// to search/parse in any hosting provider's log viewer (Vercel, Railway,
// etc. all capture stdout/stderr and index it).
//
// This intentionally has no external dependency (no Sentry/Datadog/etc.)
// since none is configured for this project. To add real error monitoring
// later: sign up for a provider, install their SDK, and call it from the
// `error()` function below alongside the console output.

type Level = "info" | "warn" | "error";

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
