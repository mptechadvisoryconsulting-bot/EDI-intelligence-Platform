export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ text: string; warnings: string[] }> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const warnings: string[] = [];

  if (ext === "pdf" || mimeType === "application/pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text?.trim() ?? "";
      if (!text) warnings.push("PDF parsed but no extractable text found (may be scanned/image-based)");
      return { text, warnings };
    } catch {
      return { text: "", warnings: ["Unable to parse PDF document"] };
    }
  }

  if (ext === "docx" || mimeType.includes("wordprocessingml")) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.trim() ?? "";
      if (result.messages.length) {
        warnings.push(`${result.messages.length} Word parsing notice(s)`);
      }
      return { text, warnings };
    } catch {
      return { text: "", warnings: ["Unable to parse Word document"] };
    }
  }

  if (ext === "doc") {
    return { text: "", warnings: ["Legacy .doc format not supported — save as .docx or PDF"] };
  }

  return { text: buffer.toString("utf8"), warnings: [] };
}
