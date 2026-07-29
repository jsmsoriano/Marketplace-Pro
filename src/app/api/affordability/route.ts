import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface Snapshot {
  safeToSpend: number;
  operatingCash: number;
  runwayDays: number;
  projectedRunwayDays: number;
  expectedIncome: number;
  unfundedTax: number;
  emergencyTarget: number;
  survivalMode: boolean;
}

interface Verdict {
  verdict: "yes" | "caution" | "no";
  headline: string;
  reasoning: string;
  safeToSpendAfter: number;
}

// The emotional core of the app: "Can I afford this today?"
// When an Anthropic API key is configured, Claude turns the engine's numbers
// into a grounded verdict. Without a key (or if the call fails) we fall back to
// a deterministic rule so the flagship feature still works — the response is
// always a usable verdict, never a hard error.
export async function POST(req: NextRequest) {
  try {
    const { item, amount, snapshot } = await req.json();

    if (!item || typeof amount !== "number" || !snapshot) {
      return NextResponse.json(
        { error: "item, amount and snapshot are required" },
        { status: 400 }
      );
    }

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        return NextResponse.json(await askClaude(item, amount, snapshot));
      } catch (err) {
        console.error("affordability AI fallback:", err);
        // fall through to the deterministic verdict
      }
    }

    return NextResponse.json(heuristicVerdict(item, amount, snapshot));
  } catch (err) {
    console.error("affordability error:", err);
    const message = err instanceof Error ? err.message : "Advisor failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function askClaude(item: string, amount: number, snapshot: Snapshot): Promise<Verdict> {
  const client = new Anthropic();

  const systemPrompt = `You are the "Safe-to-Spend" advisor inside a financial app for freelancers and gig workers. The user is about to make a discretionary purchase and wants a fast, honest answer to: "Can I afford this today?"

You are given the user's already-calculated financial snapshot. DO NOT recompute or invent numbers — reason only over what you are given. Freelancers have irregular income, so weigh runway, unfunded tax liability, and outstanding invoices, not just the raw balance.

Decision guidance:
- "yes": the purchase leaves a comfortable Safe-to-Spend buffer and doesn't dent runway.
- "caution": affordable but it meaningfully eats the buffer, or depends on an expected invoice landing.
- "no": it pushes Safe-to-Spend negative or below a healthy cushion, or jeopardizes tax/fixed obligations.

Return ONLY valid JSON, no markdown:
{
  "verdict": "yes" | "caution" | "no",
  "headline": "<=6 words, punchy",
  "reasoning": "<=2 sentences, concrete, references their actual numbers>",
  "safeToSpendAfter": <number: their safeToSpend minus the amount>
}`;

  const userPrompt = `PURCHASE: ${item} for $${amount}

FINANCIAL SNAPSHOT (USD):
- Safe-to-Spend right now: ${snapshot.safeToSpend}
- Operating cash: ${snapshot.operatingCash}
- Runway (days of survival, no new income): ${snapshot.runwayDays}
- Runway if outstanding invoices get paid: ${snapshot.projectedRunwayDays}
- Outstanding invoices (expected income): ${snapshot.expectedIncome}
- Unfunded tax liability: ${snapshot.unfundedTax}
- Emergency buffer being protected: ${snapshot.emergencyTarget}
- Survival mode: ${snapshot.survivalMode ? "ON (lean spending)" : "off"}

Give your verdict as JSON only.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from AI");

  const jsonText = content.text
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  const parsed = JSON.parse(jsonText);
  const verdict: Verdict["verdict"] = ["yes", "caution", "no"].includes(parsed.verdict)
    ? parsed.verdict
    : "caution";

  return {
    verdict,
    headline: String(parsed.headline ?? "").slice(0, 60),
    reasoning: String(parsed.reasoning ?? ""),
    safeToSpendAfter:
      typeof parsed.safeToSpendAfter === "number"
        ? parsed.safeToSpendAfter
        : snapshot.safeToSpend - amount,
  };
}

function money(n: number): string {
  return (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
}

// Deterministic verdict, used whenever the AI advisor is unavailable.
function heuristicVerdict(item: string, amount: number, s: Snapshot): Verdict {
  const after = s.safeToSpend - amount;

  if (after < 0) {
    const shortfall = Math.abs(after);
    return {
      verdict: "no",
      headline: "Not today",
      reasoning: `This puts you ${money(shortfall)} past your Safe-to-Spend and would dip into taxes owed or your emergency buffer. Wait until an invoice clears — you have ${money(s.expectedIncome)} outstanding.`,
      safeToSpendAfter: after,
    };
  }

  // Comfortable if it leaves at least 40% of the current buffer and half the runway.
  const comfortable = after >= s.safeToSpend * 0.4 && s.runwayDays >= 45;
  if (comfortable) {
    return {
      verdict: "yes",
      headline: "You're clear for this",
      reasoning: `${money(amount)} still leaves ${money(after)} safe to spend and ${s.runwayDays} days of runway. Taxes are already accounted for.`,
      safeToSpendAfter: after,
    };
  }

  return {
    verdict: "caution",
    headline: "Doable, but tight",
    reasoning: `It leaves only ${money(after)} of buffer. Fine if your ${money(s.expectedIncome)} in outstanding invoices lands on time — risky if a client pays late.`,
    safeToSpendAfter: after,
  };
}
