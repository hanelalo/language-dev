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

  // Try object format: [{"index": 1, "text": "..."}, ...]
  const objectResult = tryParseObjectArray(parsed, expectedCount);
  if (objectResult !== null) return objectResult;

  // Fallback: string array format: ["...", "..."]
  return tryParseStringArray(parsed, expectedCount);
}

function tryParseObjectArray(arr: unknown[], expectedCount: number): ParseResult | null {
  if (arr.length === 0 || typeof arr[0] !== "object" || arr[0] === null || !("index" in arr[0] && "text" in arr[0])) {
    return null;
  }

  const entries: { index: number; text: string }[] = [];
  for (const item of arr) {
    if (
      typeof item !== "object" || item === null ||
      typeof (item as Record<string, unknown>).index !== "number" ||
      typeof (item as Record<string, unknown>).text !== "string" ||
      (item as Record<string, unknown>).text === ""
    ) {
      const partial = entries.sort((a, b) => a.index - b.index).map(e => e.text);
      return {
        ok: false,
        error: "Array contains invalid object entries",
        partial: partial.length > 0 ? partial : undefined,
      };
    }
    entries.push({ index: (item as Record<string, unknown>).index as number, text: (item as Record<string, unknown>).text as string });
  }

  if (entries.length !== expectedCount) {
    const partial = entries.sort((a, b) => a.index - b.index).map(e => e.text);
    return {
      ok: false,
      error: `Expected ${expectedCount} items, got ${entries.length}`,
      partial: partial.length > 0 ? partial : undefined,
    };
  }

  entries.sort((a, b) => a.index - b.index);
  return { ok: true, items: entries.map(e => e.text) };
}

function tryParseStringArray(arr: unknown[], expectedCount: number): ParseResult {
  if (arr.length !== expectedCount) {
    const validItems = toValidStringArray(arr);
    return {
      ok: false,
      error: `Expected array length ${expectedCount}, got ${arr.length}`,
      partial: validItems.length > 0 ? validItems : undefined,
    };
  }

  const items = toValidStringArray(arr);
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
