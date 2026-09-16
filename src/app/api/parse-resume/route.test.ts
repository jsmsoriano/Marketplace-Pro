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

  it("returns 400 when no file is provided", async () => {
    const req = new NextRequest("http://localhost/api/parse-resume", {
      method: "POST",
      body: new FormData(),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
