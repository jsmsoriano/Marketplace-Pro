"use client";

import { useFinance } from "./FinanceProvider";
import { Monogram, Meter, Pill } from "./ui";
import {
  taxOwedYTD,
  taxSetAside,
  taxableProfitYTD,
  paidIncomeYTD,
  deductionsYTD,
  daysUntil,
  money,
} from "@/lib/finance";

// Next federal quarterly estimated-tax deadline for the demo's timeframe.
const NEXT_QUARTERLY = "2026-09-15";

export function TaxView() {
  const { state, setTaxRate, moveToTaxVault } = useFinance();
  const owed = taxOwedYTD(state);
  const setAside = taxSetAside(state);
  const unfunded = Math.max(0, owed - setAside);
  const funded = Math.min(setAside, owed);
  const daysToDeadline = daysUntil(NEXT_QUARTERLY);
  const urgent = daysToDeadline <= 45;

  return (
    <div className="space-y-5">
      {/* Hero: quarantine status */}
      <section className="animate-rise surface rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <Monogram letter="T" size={44} urgent={unfunded > 0} />
          <div>
            <h2 className="text-lg font-semibold text-mist-100">Tax Quarantine</h2>
            <p className="text-sm text-mist-500">Money set aside before you can touch it.</p>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs text-mist-500">Quarantined for taxes</p>
            <p className="tabular mt-1 text-3xl font-bold text-mist-100">{money(setAside)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-mist-500">Owed so far</p>
            <p className="tabular mt-1 text-xl font-semibold text-mist-300">{money(owed)}</p>
          </div>
        </div>

        <div className="mt-4">
          <Meter value={funded} max={owed} tone={unfunded > 0 ? "ember" : "safe"} />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-mist-500">{owed > 0 ? Math.round((funded / owed) * 100) : 100}% funded</span>
            {unfunded > 0 ? (
              <span className="text-ember-400">{money(unfunded)} short</span>
            ) : (
              <span className="text-safe-400">Fully covered</span>
            )}
          </div>
        </div>

        {unfunded > 0 && (
          <button
            onClick={() => moveToTaxVault(unfunded)}
            className="ember-gradient mt-5 w-full rounded-2xl py-3.5 font-semibold text-white transition active:scale-[0.99]"
          >
            Quarantine {money(unfunded)} now
          </button>
        )}
      </section>

      {/* Deadline — orange→red urgency band */}
      <section
        className={`rounded-3xl p-5 ${
          urgent ? "ember-gradient" : "surface"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs ${urgent ? "text-white/80" : "text-mist-500"}`}>
              Next quarterly estimate (Q3)
            </p>
            <p className={`mt-1 text-lg font-semibold ${urgent ? "text-white" : "text-mist-100"}`}>
              Sept 15, 2026
            </p>
          </div>
          <div className="text-right">
            <p className={`tabular text-3xl font-bold ${urgent ? "text-white" : "text-mist-100"}`}>
              {daysToDeadline}
            </p>
            <p className={`text-xs ${urgent ? "text-white/80" : "text-mist-500"}`}>days away</p>
          </div>
        </div>
      </section>

      {/* How the number is built */}
      <section className="surface rounded-3xl p-5">
        <h3 className="mb-3 text-sm font-medium text-mist-500">How this is calculated</h3>
        <div className="space-y-2.5 text-sm">
          <Row label="Net income collected" value={money(paidIncomeYTD(state))} />
          <Row label="Business deductions" value={`−${money(deductionsYTD(state))}`} tone="safe" />
          <div className="border-t border-ink-700 pt-2.5">
            <Row label="Taxable profit" value={money(taxableProfitYTD(state))} bold />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-mist-300">Set-aside rate</span>
            <Pill tone="ember">{state.settings.taxRatePct}%</Pill>
          </div>
          <input
            type="range"
            min={15}
            max={45}
            value={state.settings.taxRatePct}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full accent-[var(--color-ember-500)]"
          />
          <p className="mt-1.5 text-xs text-mist-500">
            Federal + self-employment + state. Adjust to match your bracket.
          </p>
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone = "default",
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "default" | "safe";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-medium text-mist-100" : "text-mist-300"}>{label}</span>
      <span
        className={`tabular ${bold ? "font-bold text-mist-100" : ""} ${
          tone === "safe" ? "text-safe-400" : "text-mist-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
