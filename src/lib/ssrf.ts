import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export class UnsafeUrlError extends Error {
  constructor(
    message = "This URL cannot be fetched. Paste the job description instead."
  ) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export type LookupFn = (hostname: string) => Promise<string[]>;

const reserved = new BlockList();
reserved.addSubnet("0.0.0.0", 8, "ipv4");
reserved.addSubnet("10.0.0.0", 8, "ipv4");
reserved.addSubnet("100.64.0.0", 10, "ipv4");
reserved.addSubnet("127.0.0.0", 8, "ipv4");
reserved.addSubnet("169.254.0.0", 16, "ipv4");
reserved.addSubnet("172.16.0.0", 12, "ipv4");
reserved.addSubnet("192.0.0.0", 24, "ipv4");
reserved.addSubnet("192.0.2.0", 24, "ipv4");
reserved.addSubnet("192.168.0.0", 16, "ipv4");
reserved.addSubnet("198.18.0.0", 15, "ipv4");
reserved.addSubnet("198.51.100.0", 24, "ipv4");
reserved.addSubnet("203.0.113.0", 24, "ipv4");
reserved.addSubnet("224.0.0.0", 4, "ipv4");
reserved.addSubnet("240.0.0.0", 4, "ipv4");
reserved.addAddress("255.255.255.255", "ipv4");
reserved.addAddress("::", "ipv6");
reserved.addAddress("::1", "ipv6");
reserved.addSubnet("fc00::", 7, "ipv6");
reserved.addSubnet("fe80::", 10, "ipv6");
reserved.addSubnet("ff00::", 8, "ipv6");
reserved.addSubnet("2001:db8::", 32, "ipv6");

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
  ".localdomain",
  ".arpa",
];

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "metadata.google.com",
]);

function normalizeIp(ip: string): { ip: string; type: "ipv4" | "ipv6" } | null {
  const version = isIP(ip);
  if (version === 4) return { ip, type: "ipv4" };
  if (version === 6) {
    const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (dotted) return { ip: dotted[1], type: "ipv4" };
    const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return {
        ip: `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`,
        type: "ipv4",
      };
    }
    return { ip, type: "ipv6" };
  }
  return null;
}

export function isReservedIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return true;
  return reserved.check(normalized.ip, normalized.type);
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export async function defaultLookup(hostname: string): Promise<string[]> {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export async function assertSafePublicUrl(
  raw: string,
  lookupFn: LookupFn = defaultLookup
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new UnsafeUrlError("Only HTTP/HTTPS URLs are allowed");
  }

  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError();
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (isBlockedHostname(hostname)) {
    throw new UnsafeUrlError();
  }

  const literalIp = normalizeIp(hostname);
  if (literalIp) {
    if (isReservedIp(literalIp.ip)) {
      throw new UnsafeUrlError();
    }
    return parsed;
  }

  let addresses: string[];
  try {
    addresses = await lookupFn(hostname);
  } catch {
    throw new UnsafeUrlError();
  }

  if (!addresses.length || addresses.some((address) => isReservedIp(address))) {
    throw new UnsafeUrlError();
  }

  return parsed;
}
