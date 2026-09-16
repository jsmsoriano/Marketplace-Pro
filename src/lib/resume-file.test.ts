import { describe, expect, it } from "vitest";
import { MAX_RESUME_FILE_BYTES } from "./limits";
import { classifyResumeFile, magicBytesError } from "./resume-file";

describe("classifyResumeFile", () => {
  it("accepts pdf, docx, and txt", () => {
    expect(classifyResumeFile({ name: "a.PDF", size: 100 })).toEqual({
      ok: true,
      kind: "pdf",
    });
    expect(classifyResumeFile({ name: "a.docx", size: 100 })).toEqual({
      ok: true,
      kind: "docx",
    });
    expect(classifyResumeFile({ name: "a.txt", size: 100 })).toEqual({
      ok: true,
      kind: "txt",
    });
  });

  it("rejects legacy .doc and oversized files", () => {
    const doc = classifyResumeFile({ name: "old.doc", size: 100 });
    expect(doc.ok).toBe(false);
    if (!doc.ok) expect(doc.error).toMatch(/not supported/i);

    const huge = classifyResumeFile({
      name: "big.pdf",
      size: MAX_RESUME_FILE_BYTES + 1,
    });
    expect(huge.ok).toBe(false);
  });
});

describe("magicBytesError", () => {
  it("rejects mismatched PDF and DOCX signatures", () => {
    expect(magicBytesError("pdf", Buffer.from("hello"))).toMatch(/PDF/);
    expect(magicBytesError("docx", Buffer.from("%PDF-1.4"))).toMatch(/DOCX/);
    expect(magicBytesError("pdf", Buffer.from("%PDF-1.4"))).toBeNull();
    expect(magicBytesError("docx", Buffer.from("PK\u0003\u0004file"))).toBeNull();
  });
});
