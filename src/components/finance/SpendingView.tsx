"use client";

import { useFinance } from "./FinanceProvider";
import { Monogram, Meter, Pill } from "./ui";
import {
  CapStatus,
  capSpending,
  totalCapSpent,
  totalCapLimit,
  daysLeftInPeriod,
  periodResetDate,
  deductibleAmount,
  deductionsYTD,
  shortDate,
  money,
} from "@/lib/finance";

function capTone(state: CapStatus["state"]): "safe" | "ember" {
  return state === "over" ? "ember" : "safe";
}

export function SpendingView() {
  const { state, toggleExpenseMode } = useFinance();

  const caps = capSpending(state);
  const spent = totalCapSpent(state);
  const budget = totalCapLimit(state);
  const daysLeft = daysLeftInPeriod(state);
  const resetLabel = periodResetDate(state).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const visible = state.expenses
    .filter((e) => !state.survivalMode || !e.discretionary)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-5">
      {/* Pay-period caps hero */}
      <section className="animate-rise surface rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monogram letter="S" size={44} />
            <div>
              <h2 className="text-lg font-semibold text-mist-100">Spending</h2>
              <p className="text-sm text-mist-500">Caps run on your pay period, not the month.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="tabular text-sm font-semibold text-mist-100">{daysLeft}d left</p>
            <p className="text-xs text-mist-500">resets {resetLabel}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-end justify-between">
            <span className="tabular text-2xl font-bold text-mist-100">{money(spent)}</span>
            <span className="tabular text-sm text-mist-500">of {money(budget)} budget</span>
          </div>
          <Meter value={spent} max={budget} tone={spent > budget ? "ember" : "safe"} />
        </div>
      </section>

      {/* Per-category caps */}
      <section className="space-y-2.5">
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-mist-600">
          Categories & caps
        </h3>
        {caps.map((c) => (
          <div key={c.category} className="surface rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-mist-100">{c.category}</span>
                {c.state === "over" && <Pill tone="ember">OVER CAP</Pill>}
                {c.state === "near" && <Pill tone="warn">Near cap</Pill>}
              </div>
              <span className="tabular text-sm text-mist-300">
                <span className={c.state === "over" ? "font-semibold text-ember-400" : "text-mist-100"}>
                  {money(c.spent, { cents: true })}
                </span>
                <span className="text-mist-600"> / {money(c.limit)}</span>
              </span>
            </div>
            <div className="mt-3">
              <Meter value={c.spent} max={c.limit} tone={capTone(c.state)} />
            </div>
            {c.state === "over" && (
              <p className="mt-2.5 text-xs text-ember-400">
                {money(c.spent - c.limit, { cents: true })} over — trim here to stay on track.
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Transactions with dual-mode tagging */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-mist-600">Transactions</h3>
          <span className="tabular text-xs text-mist-600">
            {money(deductionsYTD(state))} deductions YTD
          </span>
        </div>

        {state.survivalMode && (
          <p className="rounded-2xl bg-ember-600/10 px-4 py-3 text-sm text-ember-400">
            Strict Mode is hiding discretionary spending — essentials only.
          </p>
        )}

        {visible.map((e) => {
          const isBusiness = e.mode === "business";
          const deduct = deductibleAmount(e);
          const label = isBusiness ? e.category : e.capCategory ?? "Personal";
          return (
            <div key={e.id} className="surface rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-mist-100">{e.merchant}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-mist-500">
                    <span>{shortDate(e.date)}</span>
                    <span>·</span>
                    <span className="truncate">{label}</span>
                    {e.discretionary && <Pill tone="muted">discretionary</Pill>}
                  </div>
                </div>
                <span className="tabular shrink-0 font-semibold text-mist-100">
                  {money(e.amount, { cents: true })}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => toggleExpenseMode(e.id)}
                  className="relative flex h-8 w-40 items-center rounded-full bg-ink-900 p-0.5 text-xs font-medium"
                  role="switch"
                  aria-checked={isBusiness}
                >
                  <span
                    className={`absolute h-7 w-[76px] rounded-full transition-transform duration-200 ${
                      isBusiness ? "translate-x-0 bg-brand-500/25" : "translate-x-[80px] bg-ink-700"
                    }`}
                  />
                  <span className={`relative z-10 flex-1 text-center ${isBusiness ? "text-brand-400" : "text-mist-500"}`}>
                    Business
                  </span>
                  <span className={`relative z-10 flex-1 text-center ${!isBusiness ? "text-mist-100" : "text-mist-500"}`}>
                    Personal
                  </span>
                </button>
                {isBusiness ? (
                  <span className="tabular text-xs text-brand-400">
                    −{money(deduct, { cents: true })} deductible
                  </span>
                ) : (
                  <span className="text-xs text-mist-600">counts to caps</span>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
