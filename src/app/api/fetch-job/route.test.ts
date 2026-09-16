import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { POST } from "./route";

function request(body: unknown, ip = "203.0.113.50") {
  return new NextRequest("http://localhost/api/fetch-job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/fetch-job", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("rejects missing URLs", async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
  });

  it("rejects SSRF targets including loopback and metadata", async () => {
    const targets = [
      "http://127.0.0.1/secret",
      "http://localhost/admin",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.1.2.3/job",
      "file:///etc/passwd",
    ];

    for (const url of targets) {
      const res = await POST(request({ url }, `198.51.100.${targets.indexOf(url) + 1}`));
      expect(res.status, url).toBe(400);
      const data = await res.json();
      expect(data.error).toBeTruthy();
      expect(data.error).not.toMatch(/ECONNREFUSED|fetch failed|ENOTFOUND/i);
    }
  });
});
