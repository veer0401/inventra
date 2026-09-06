/**
 * Recursively sort JSON keys to produce deterministic canonical JSON representation
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const canonicalElements = obj.map((elem) => JSON.parse(canonicalizeJson(elem)));
    return JSON.stringify(canonicalElements);
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const sortedObj: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== undefined) {
      sortedObj[key] = typeof val === "object" && val !== null ? JSON.parse(canonicalizeJson(val)) : val;
    }
  }

  return JSON.stringify(sortedObj);
}

/**
 * Calculate SHA-256 hash string (hex) of a string using Web Crypto API
 */
export async function calculateSha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute SHA-256 payload checksum for an offline sync event payload
 */
export async function computePayloadChecksum(payload: Record<string, unknown>): Promise<string> {
  const canonical = canonicalizeJson(payload);
  return calculateSha256(canonical);
}
