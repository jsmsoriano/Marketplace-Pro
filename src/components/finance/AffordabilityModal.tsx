"use client";

import { useState } from "react";
import { useFinance } from "./FinanceProvider";
import { Sheet, Pill } from "./ui";
import {
  safeToSpend,
  operatingCash,
  runwayDays,
  projectedRunwayDays,
  expectedIncome,
  taxOwedYTD,
  taxSetAside,
  money,
} from "@/lib/finance";

interface Verdict {
  verdict: "yes" | "caution" | "no";
  headline: string;
  reasoning: string;
  safeToSpendAfter: number;
}

export function AffordabilityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useFinance();
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Verdict | null>(null);

  const reset = () => {
    setItem("");
    setAmount("");
    setResult(null);
    setError("");
  };

  const ask = async () => {
    const value = parseFloat(amount);
    if (!item.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Add what it is and how much it costs.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const snapshot = {
        safeToSpend: Math.round(safeToSpend(state)),
        operatingCash: Math.round(operatingCash(state)),
        runwayDays: runwayDays(state),
        projectedRunwayDays: projectedRunwayDays(state),
        expectedIncome: Math.round(expectedIncome(state)),
        unfundedTax: Math.round(Math.max(0, taxOwedYTD(state) - taxSetAside(state))),
        emergencyTarget: state.settings.emergencyTarget,
        survivalMode: state.survivalMode,
      };
      const res = await fetch("/api/affordability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: item.trim(), amount: value, snapshot }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Advisor unavailable");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verdictTone: Record<Verdict["verdict"], "safe" | "warn" | "ember"> = {
    yes: "safe",
    caution: "warn",
    no: "ember",
  };
  const verdictLabel: Record<Verdict["verdict"], string> = {
    yes: "Go for it",
    caution: "Think twice",
    no: "Not today",
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Can I afford this?"
    >
      {!result && (
        <div className="space-y-4">
          <p className="text-sm text-mist-500">
            The advisor reasons over your live runway, taxes owed and outstanding invoices — not
            just your balance.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-mist-500">What is it?</label>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. new iPad for client work"
              className="w-full rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-mist-100 placeholder:text-mist-600 focus:border-ember-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-mist-500">How much?</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mist-500">$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                className="tabular w-full rounded-xl border border-ink-700 bg-ink-900 py-3 pl-8 pr-4 text-mist-100 placeholder:text-mist-600 focus:border-ember-500 focus:outline-none"
              />
            </div>
          </div>
          {error && <p className="text-sm text-ember-400">{error}</p>}
          <button
            onClick={ask}
            disabled={loading}
            className="ember-gradient w-full rounded-xl py-3.5 font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Checking your numbers…" : "Ask the advisor"}
          </button>
        </div>
      )}

      {result && (
        <div className="animate-rise space-y-4">
          <div className="flex items-center gap-3">
            <Pill tone={verdictTone[result.verdict]}>{verdictLabel[result.verdict]}</Pill>
            <span className="text-sm text-mist-500">
              {item} · {money(parseFloat(amount) || 0)}
            </span>
          </div>
          <h4 className="text-2xl font-bold text-mist-100">{result.headline}</h4>
          <p className="text-mist-300">{result.reasoning}</p>
          <div className="surface flex items-center justify-between rounded-2xl p-4">
            <span className="text-sm text-mist-500">Safe-to-Spend afterward</span>
            <span
              className={`tabular text-xl font-bold ${
                result.safeToSpendAfter < 0 ? "text-ember-400" : "text-safe-400"
              }`}
            >
              {money(result.safeToSpendAfter)}
            </span>
          </div>
          <button
            onClick={reset}
            className="w-full rounded-xl border border-ink-700 py-3 font-medium text-mist-300 hover:bg-ink-800"
          >
            Check another purchase
          </button>
        </div>
      )}
    </Sheet>
  );
}
