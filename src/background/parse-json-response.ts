export type ParseResult =
  | { ok: true; items: string[] }
  | { ok: false; error: string; partial?: string[] };

export function parseTranslationArray(raw: string, expectedCount: number): ParseResult {
  const extracted = extractJsonString(raw);
  if (extracted === null) {
    return { ok: false, error: "No valid JSON found in response" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    return { ok: false, error: "JSON parse failed" };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: `Expected array, got ${typeof parsed}` };
  }

  if (parsed.length !== expectedCount) {
    const validItems = toValidStringArray(parsed);
    return {
      ok: false,
      error: `Expected array length ${expectedCount}, got ${parsed.length}`,
      partial: validItems.length > 0 ? validItems : undefined,
    };
  }

  const items = toValidStringArray(parsed);
  if (items.length !== expectedCount) {
    return {
      ok: false,
      error: `Array contains non-string or empty elements`,
      partial: items.length > 0 ? items : undefined,
    };
  }

  return { ok: true, items };
}

function toValidStringArray(arr: unknown[]): string[] {
  const result: string[] = [];
  for (const item of arr) {
    if (typeof item === "string" && item.length > 0) {
      result.push(item);
    }
  }
  return result;
}

function extractJsonString(raw: string): string | null {
  // Strategy 1: Direct parse
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    try {
      JSON.parse(inner);
      return inner;
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find first [ and last ]
  const firstBracket = raw.indexOf("[");
  const lastBracket = raw.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = raw.slice(firstBracket, lastBracket + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // All strategies failed
    }
  }

  return null;
}
