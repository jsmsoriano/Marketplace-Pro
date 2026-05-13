import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only HTTP/HTTPS URLs are allowed" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResumeOptimizerBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (status ${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise elements
    $("script, style, nav, header, footer, aside, iframe, noscript, [aria-hidden='true']").remove();

    // Try common job description containers first
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

    // Normalize whitespace
    text = text.replace(/\s{3,}/g, "\n\n").replace(/\t/g, " ").trim();

    if (text.length < 100) {
      return NextResponse.json(
        { error: "Could not extract meaningful content from this URL. Try pasting the job description instead." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: text.slice(0, 10000) });
  } catch (err) {
    console.error("fetch-job error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch job description";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
