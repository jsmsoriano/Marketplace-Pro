import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/parse-resume", () => {
  it("extracts text from a txt upload", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File(["Jane Doe\nSoftware Engineer"], "resume.txt", { type: "text/plain" })
    );
    const req = new NextRequest("http://localhost/api/parse-resume", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      text: "Jane Doe\nSoftware Engineer",
    });
  });

  it("rejects legacy .doc uploads", async () => {
    const form = new FormData();
    form.append("file", new File(["legacy"], "old.doc", { type: "application/msword" }));
    const req = new NextRequest("http://localhost/api/parse-resume", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/not supported/i);
  });

  it("rejects a PDF extension whose bytes are not a PDF", async () => {
    const form = new FormData();
    form.append("file", new File(["not a pdf"], "resume.pdf", { type: "application/pdf" }));
    const req = new NextRequest("http://localhost/api/parse-resume", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/PDF/);
  });

  it("extracts text from a real PDF with the v2 parser", async () => {
    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT /F1 18 Tf 24 72 Td (Hello Resume) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`;
    const form = new FormData();
    form.append(
      "file",
      new File([pdf], "resume.pdf", { type: "application/pdf" })
    );
    const req = new NextRequest("http://localhost/api/parse-resume", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toContain("Hello Resume");
  });

  it("returns 400 when no file is provided", async () => {
    const req = new NextRequest("http://localhost/api/parse-resume", {
      method: "POST",
      body: new FormData(),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
