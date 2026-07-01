import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseDocumentContent, summarizeParsed } from "@/lib/parsers/document-parser";
import type { ParsedDocument } from "@/lib/types/parsing";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".csv",
  ".xlsx",
  ".xls",
  ".txt",
  ".pdf",
  ".docx",
  ".json",
  ".xml",
  ".edi",
  ".dat",
  ".out",
  ".flat",
]);

export function validateUpload(fileName: string, size: number) {
  if (size > MAX_UPLOAD_BYTES) {
    return `File exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`;
  }
  const ext = path.extname(fileName).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return `File type ${ext} is not allowed`;
  }
  return null;
}

export function shouldPersistUploadToDisk() {
  return process.env.VERCEL !== "1" && process.env.SKIP_UPLOAD_DISK !== "1";
}

export function getUploadDir(projectId: string) {
  return path.join(process.cwd(), "uploads", projectId);
}

export async function saveUploadedFile(
  projectId: string,
  documentId: string,
  filename: string,
  buffer: Buffer
) {
  if (!shouldPersistUploadToDisk()) {
    return null;
  }
  const dir = getUploadDir(projectId);
  await mkdir(dir, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${documentId}-${safeName}`;
  const fullPath = path.join(dir, storedName);
  await writeFile(fullPath, buffer);
  return fullPath;
}

export async function parseUploadedFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  docType: string
): Promise<ParsedDocument> {
  return parseDocumentContent(buffer, filename, mimeType, docType);
}

export function buildParseSummary(parsed: ParsedDocument) {
  return summarizeParsed(parsed);
}

export function deserializeParsed(content: string | null | undefined): ParsedDocument | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as ParsedDocument;
  } catch {
    return null;
  }
}

export function normalizeParsedDocument(doc: ParsedDocument): ParsedDocument {
  return { ...doc, testScenarios: doc.testScenarios ?? [] };
}
