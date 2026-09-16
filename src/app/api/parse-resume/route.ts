import { NextRequest, NextResponse } from "next/server";
import {
  classifyResumeFile,
  extractResumeText,
  magicBytesError,
} from "@/lib/resume-file";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const classified = classifyResumeFile(file);
    if (!classified.ok) {
      return NextResponse.json({ error: classified.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const magicError = magicBytesError(classified.kind, buffer);
    if (magicError) {
      return NextResponse.json({ error: magicError }, { status: 400 });
    }

    const text = await extractResumeText(classified.kind, buffer);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("parse-resume error:", err);
    if (err instanceof Error && err.message === "EMPTY_RESUME") {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}
