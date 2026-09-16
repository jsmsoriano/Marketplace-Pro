import { describe, expect, it } from "vitest";
import { assertSafePublicUrl, isBlockedHostname, isReservedIp, UnsafeUrlError } from "./ssrf";

describe("isReservedIp", () => {
  it("blocks loopback, private, and metadata addresses", () => {
    expect(isReservedIp("127.0.0.1")).toBe(true);
    expect(isReservedIp("10.0.0.5")).toBe(true);
    expect(isReservedIp("192.168.1.1")).toBe(true);
    expect(isReservedIp("172.16.4.4")).toBe(true);
    expect(isReservedIp("169.254.169.254")).toBe(true);
    expect(isReservedIp("0.0.0.0")).toBe(true);
    expect(isReservedIp("::1")).toBe(true);
    expect(isReservedIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isReservedIp("8.8.8.8")).toBe(false);
    expect(isReservedIp("93.184.216.34")).toBe(false);
  });
});

describe("isBlockedHostname", () => {
  it("blocks localhost and internal names", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("app.localhost")).toBe(true);
    expect(isBlockedHostname("printer.local")).toBe(true);
    expect(isBlockedHostname("metadata.google.internal")).toBe(true);
  });

  it("allows ordinary public hostnames", () => {
    expect(isBlockedHostname("jobs.example.com")).toBe(false);
  });
});

describe("assertSafePublicUrl", () => {
  it("rejects non-http protocols", async () => {
    await expect(assertSafePublicUrl("file:///etc/passwd")).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
    await expect(assertSafePublicUrl("ftp://example.com/job")).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
  });

  it("rejects loopback and private IP literals without DNS", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.1/secret")).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
    await expect(
      assertSafePublicUrl("http://169.254.169.254/latest/meta-data/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafePublicUrl("http://10.0.0.8/job")).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
    await expect(assertSafePublicUrl("http://[::1]/")).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
  });

  it("rejects localhost hostnames", async () => {
    await expect(assertSafePublicUrl("http://localhost:3000/job")).rejects.toBeInstanceOf(
      UnsafeUrlError
    );
  });

  it("rejects URLs with credentials", async () => {
    await expect(
      assertSafePublicUrl("https://user:pass@example.com/job")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects hostnames that resolve to private IPs", async () => {
    await expect(
      assertSafePublicUrl("https://evil.example", async () => ["127.0.0.1"])
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("allows public hostnames that resolve to public IPs", async () => {
    const url = await assertSafePublicUrl(
      "https://jobs.example.com/role",
      async () => ["93.184.216.34"]
    );
    expect(url.hostname).toBe("jobs.example.com");
  });
});
