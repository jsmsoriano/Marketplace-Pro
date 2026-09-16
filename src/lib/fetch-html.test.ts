import { describe, expect, it, vi } from "vitest";
import { FetchJobError, fetchPublicHtml } from "./fetch-html";
import { UnsafeUrlError } from "./ssrf";

function jsonResponse(status: number, headers: Record<string, string>, body = "") {
  return new Response(body, { status, headers });
}

describe("fetchPublicHtml", () => {
  it("does not follow a redirect to a private address", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(302, { location: "http://127.0.0.1/secret" })
    );

    await expect(
      fetchPublicHtml("https://jobs.example.com/role", {
        fetch: fetchMock as unknown as typeof fetch,
        lookup: async () => ["93.184.216.34"],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-html content types", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { "content-type": "application/pdf" }, "%PDF")
    );

    await expect(
      fetchPublicHtml("https://jobs.example.com/role.pdf", {
        fetch: fetchMock as unknown as typeof fetch,
        lookup: async () => ["93.184.216.34"],
      })
    ).rejects.toBeInstanceOf(FetchJobError);
  });

  it("returns html from a public page", async () => {
    const html = "<html><body><p>Software Engineer job posting with requirements</p></body></html>";
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { "content-type": "text/html; charset=utf-8" }, html)
    );

    const text = await fetchPublicHtml("https://jobs.example.com/role", {
      fetch: fetchMock as unknown as typeof fetch,
      lookup: async () => ["93.184.216.34"],
    });
    expect(text).toContain("Software Engineer");
  });
});
