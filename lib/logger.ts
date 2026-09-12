export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): string {
  const requestId = generateRequestId();
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${context}#${requestId}]`, error, meta ?? {});
  } else {
    // Extension point for error monitoring (Sentry, Grafana, ...).
    // Keep the raw payload out of the client bundle in production.
    console.error(`[${context}#${requestId}]`, String(error));
  }
  return requestId;
}
