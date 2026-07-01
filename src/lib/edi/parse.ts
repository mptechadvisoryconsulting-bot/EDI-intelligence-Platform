export type EdiSegmentRow = {
  segment: string;
  elements: string[];
  /** Qualifier from element 01 when segment uses qualifier pattern (REF, N1, etc.) */
  qualifier?: string;
  raw: string;
};

export type ParsedEdiMessage = {
  transactionSet: string | null;
  segments: EdiSegmentRow[];
  segmentIds: string[];
};

export function parseEdiText(text: string): ParsedEdiMessage[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const chunks = normalized.includes("~")
    ? normalized.split("~")
    : normalized.split(/\n/).filter(Boolean);

  const allSegments: EdiSegmentRow[] = [];
  let currentTx: string | null = null;

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const parts = trimmed.split("*").map((p) => p.trim());
    const segment = parts[0]?.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!segment || !/^[A-Z0-9]{2,3}$/.test(segment)) continue;

    const elements = parts.slice(1);
    const qualifier =
      ["REF", "N1", "N3", "N4", "DTM", "PID", "TD5", "MAN"].includes(segment) && elements[0]
        ? elements[0]
        : undefined;

    const row: EdiSegmentRow = { segment, elements, qualifier, raw: trimmed };
    allSegments.push(row);

    if (segment === "ST" && elements[0]) {
      currentTx = elements[0];
    }
  }

  if (allSegments.length === 0) {
    return [{ transactionSet: null, segments: [], segmentIds: [] }];
  }

  const messages: ParsedEdiMessage[] = [];
  let batch: EdiSegmentRow[] = [];
  let tx: string | null = null;

  for (const row of allSegments) {
    if (row.segment === "ST" && batch.length > 0) {
      messages.push({
        transactionSet: tx,
        segments: batch,
        segmentIds: [...new Set(batch.map((s) => s.segment))],
      });
      batch = [];
    }
    if (row.segment === "ST") {
      tx = row.elements[0] ?? null;
    }
    batch.push(row);
    if (row.segment === "SE") {
      messages.push({
        transactionSet: tx,
        segments: batch,
        segmentIds: [...new Set(batch.map((s) => s.segment))],
      });
      batch = [];
      tx = null;
    }
  }

  if (batch.length > 0) {
    messages.push({
      transactionSet: tx ?? currentTx,
      segments: batch,
      segmentIds: [...new Set(batch.map((s) => s.segment))],
    });
  }

  return messages.length > 0 ? messages : [{ transactionSet: currentTx, segments: allSegments, segmentIds: [...new Set(allSegments.map((s) => s.segment))] }];
}

export function fieldKey(segment: string, element: string, qualifier?: string | null) {
  return `${segment}.${element}${qualifier ? `:${qualifier}` : ""}`;
}

export function getElementValue(row: EdiSegmentRow, element: string): string | undefined {
  const idx = parseInt(element, 10) - 1;
  if (idx < 0 || idx >= row.elements.length) return undefined;
  const val = row.elements[idx]?.trim();
  return val || undefined;
}

export function findSegments(
  message: ParsedEdiMessage,
  segment: string,
  qualifier?: string | null
): EdiSegmentRow[] {
  return message.segments.filter((row) => {
    if (row.segment !== segment) return false;
    if (qualifier && row.qualifier !== qualifier) return false;
    return true;
  });
}
