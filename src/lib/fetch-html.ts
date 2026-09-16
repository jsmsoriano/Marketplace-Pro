import {
  FETCH_TIMEOUT_MS,
  MAX_FETCH_REDIRECTS,
  MAX_HTML_BYTES,
} from "./limits";
import { assertSafePublicUrl, type LookupFn, UnsafeUrlError } from "./ssrf";

export class FetchJobError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FetchJobError";
    this.status = status;
  }
}

const ALLOWED_CONTENT_TYPES =
  /^(text\/html|application\/xhtml\+xml|text\/plain|text\/xml|application\/xml)\b/i;

export async function readResponseText(
  response: Response,
  maxBytes: number
): Promise<string> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    throw new FetchJobError(
      "The page is too large to fetch. Paste the job description instead."
    );
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new FetchJobError(
          "The page is too large to fetch. Paste the job description instead."
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(combined);
}

type FetchHtmlDeps = {
  fetch?: typeof fetch;
  lookup?: LookupFn;
};

export async function fetchPublicHtml(
  rawUrl: string,
  deps: FetchHtmlDeps = {}
): Promise<string> {
  const fetchFn = deps.fetch ?? fetch;
  let current = await assertSafePublicUrl(rawUrl, deps.lookup);

  for (let hop = 0; hop <= MAX_FETCH_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetchFn(current, {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ResumeOptimizerBot/1.0)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      if (err instanceof UnsafeUrlError || err instanceof FetchJobError) {
        throw err;
      }
      throw new FetchJobError(
        "Could not fetch this URL. Paste the job description instead."
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) {
        throw new FetchJobError(
          "Could not fetch this URL. Paste the job description instead."
        );
      }
      if (hop === MAX_FETCH_REDIRECTS) {
        throw new FetchJobError(
          "Too many redirects. Paste the job description instead."
        );
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new UnsafeUrlError();
      }
      current = await assertSafePublicUrl(next.href, deps.lookup);
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new FetchJobError(
        "Could not fetch this URL. Paste the job description instead."
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !ALLOWED_CONTENT_TYPES.test(contentType)) {
      await response.body?.cancel();
      throw new FetchJobError(
        "This URL did not return a web page. Paste the job description instead."
      );
    }

    return readResponseText(response, MAX_HTML_BYTES);
  }

  throw new FetchJobError("Too many redirects. Paste the job description instead.");
}
