/** Turn a failed fetch body (often JSON `{ error }`) into a human-readable string. */
export function parseFetchErrorBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Something went wrong. Please try again.";

  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string" && parsed.error) return parsed.error;
    if (typeof parsed.message === "string" && parsed.message) return parsed.message;
  } catch {
    /* plain text */
  }

  return trimmed;
}
