import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { POST } from "./route";

function request(body: unknown, ip = "203.0.113.10") {
  return new NextRequest("http://localhost/api/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/optimize", () => {
  beforeEach(() => {
    resetRateLimits();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns 400 when resume or job description is missing", async () => {
    const res = await POST(request({ resumeText: "only resume" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Resume text and job description are required",
    });
  });

  it("returns 400 when payloads exceed size limits", async () => {
    const res = await POST(
      request({
        resumeText: "a".repeat(50_001),
        jobDescription: "Engineer role",
      })
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Resume or job description is too long.",
    });
  });

  it("returns 503 when the API key is missing", async () => {
    const res = await POST(
      request({
        resumeText: "Jane Doe\nEngineer",
        jobDescription: "Looking for an engineer",
      })
    );
    expect(res.status).toBe(503);
  });

  it("returns 429 after the per-IP optimize budget is exhausted", async () => {
    const payload = {
      resumeText: "Jane Doe\nEngineer",
      jobDescription: "Looking for an engineer",
    };
    for (let i = 0; i < 5; i++) {
      const res = await POST(request(payload, "198.51.100.20"));
      expect(res.status).toBe(503);
    }
    const limited = await POST(request(payload, "198.51.100.20"));
    expect(limited.status).toBe(429);
  });
});
