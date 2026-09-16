import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { FetchJobError, fetchPublicHtml } from "@/lib/fetch-html";
import {
  FETCH_JOB_RATE_LIMIT,
  MAX_JOB_TEXT_CHARS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/limits";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { UnsafeUrlError } from "@/lib/ssrf";

export const runtime = "nodejs";

function extractJobText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside, iframe, noscript, [aria-hidden='true']").remove();

  const selectors = [
    "[class*='job-description']",
    "[class*='jobDescription']",
    "[id*='job-description']",
    "[id*='jobDescription']",
    "[class*='job-details']",
    "[class*='description']",
    "article",
    "main",
    ".content",
    "#content",
  ];

  let text = "";
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 200) {
      text = el.text().trim();
      break;
    }
  }

  if (!text) {
    text = $("body").text().trim();
  }

  return text.replace(/\s{3,}/g, "\n\n").replace(/\t/g, " ").trim();
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    if (!allowRequest(`fetch-job:${ip}`, FETCH_JOB_RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many fetch requests. Try again in a few minutes." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const url =
      body && typeof body === "object" && "url" in body
        ? (body as { url: unknown }).url
        : undefined;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const html = await fetchPublicHtml(url);
    const text = extractJobText(html);

    if (text.length < 100) {
      return NextResponse.json(
        {
          error:
            "Could not extract meaningful content from this URL. Try pasting the job description instead.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: text.slice(0, MAX_JOB_TEXT_CHARS) });
  } catch (err) {
    if (err instanceof UnsafeUrlError || err instanceof FetchJobError) {
      return NextResponse.json(
        { error: err.message },
        { status: err instanceof FetchJobError ? err.status : 400 }
      );
    }
    console.error("fetch-job error:", err);
    return NextResponse.json(
      { error: "Failed to fetch job description" },
      { status: 500 }
    );
  }
}
