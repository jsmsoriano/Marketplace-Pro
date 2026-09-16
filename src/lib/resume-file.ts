import { PDFParse } from "pdf-parse";
import { MAX_RESUME_FILE_BYTES, MAX_RESUME_TEXT_CHARS } from "./limits";

export type ResumeKind = "pdf" | "docx" | "txt";

export function classifyResumeFile(file: {
  name: string;
  size: number;
}): { ok: true; kind: ResumeKind } | { ok: false; error: string } {
  if (file.size > MAX_RESUME_FILE_BYTES) {
    return { ok: false, error: "File must be under 10MB." };
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return { ok: true, kind: "pdf" };
  if (name.endsWith(".docx")) return { ok: true, kind: "docx" };
  if (name.endsWith(".txt")) return { ok: true, kind: "txt" };
  if (name.endsWith(".doc")) {
    return {
      ok: false,
      error: "Legacy .doc files are not supported. Save as PDF or DOCX.",
    };
  }

  return {
    ok: false,
    error: "Unsupported file type. Upload a PDF, DOCX, or TXT file.",
  };
}

export function magicBytesError(kind: ResumeKind, buffer: Buffer): string | null {
  if (kind === "pdf" && buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    return "File does not look like a valid PDF.";
  }
  if (kind === "docx" && (buffer[0] !== 0x50 || buffer[1] !== 0x4b)) {
    return "File does not look like a valid DOCX.";
  }
  return null;
}

export async function extractResumeText(
  kind: ResumeKind,
  buffer: Buffer
): Promise<string> {
  let text = "";

  if (kind === "txt") {
    text = buffer.toString("utf-8");
  } else if (kind === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  }

  text = text.trim();
  if (!text) {
    throw new Error("EMPTY_RESUME");
  }

  return text.slice(0, MAX_RESUME_TEXT_CHARS);
}
