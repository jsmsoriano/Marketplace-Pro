import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Resume text and job description are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert resume writer and career coach with deep knowledge of ATS (Applicant Tracking Systems), hiring practices, and resume optimization. Your task is to rewrite and optimize a resume to perfectly match a specific job description.

Rules:
- Preserve ALL factual information (employers, job titles, dates, education, actual accomplishments)
- Do NOT fabricate experience, skills, or achievements the candidate doesn't have
- Reorder bullet points to lead with the most relevant experience for this role
- Mirror the job description's language and keywords where they truthfully apply
- Strengthen weak bullet points using strong action verbs and quantifiable impact where implied
- Reorganize sections to put the most relevant experience/skills at the top
- Update the skills section to emphasize skills mentioned in the job description that the candidate has
- Format cleanly for ATS compatibility (avoid tables, columns, special chars)
- If the candidate has a summary/objective, rewrite it for this specific role

Return ONLY valid JSON in this exact format:
{
  "optimizedResume": "<the full optimized resume as plain text>",
  "changes": ["change description 1", "change description 2", ...],
  "jobTitle": "<extracted job title from job description>",
  "matchScore": <integer 0-100 representing how well the resume matches the job after optimization>
}

The changes array should list 5-10 specific, meaningful changes made. matchScore should reflect genuine fit.`;

    const userPrompt = `ORIGINAL RESUME:
${resumeText}

---

JOB DESCRIPTION:
${jobDescription}

---

Please optimize the resume for this specific job. Return only the JSON response.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    let parsed;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonText = content.text
        .replace(/^```json\s*/m, "")
        .replace(/^```\s*/m, "")
        .replace(/\s*```$/m, "")
        .trim();
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    if (!parsed.optimizedResume || !parsed.changes || !parsed.jobTitle) {
      throw new Error("Incomplete response from AI");
    }

    return NextResponse.json({
      optimizedResume: parsed.optimizedResume,
      changes: parsed.changes,
      jobTitle: parsed.jobTitle,
      matchScore: Math.min(100, Math.max(0, Number(parsed.matchScore) || 75)),
    });
  } catch (err) {
    console.error("optimize error:", err);
    const message = err instanceof Error ? err.message : "Optimization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
