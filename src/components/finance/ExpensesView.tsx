"use client";

import { useFinance } from "./FinanceProvider";
import { Monogram, Pill } from "./ui";
import { deductibleAmount, deductionsYTD, shortDate, money } from "@/lib/finance";

export function ExpensesView() {
  const { state, toggleExpenseMode } = useFinance();

  const visible = state.expenses
    .filter((e) => !state.survivalMode || !e.discretionary)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const businessCount = state.expenses.filter((e) => e.mode === "business").length;

  return (
    <div className="space-y-5">
      {/* Hero: deductions captured */}
      <section className="animate-rise surface rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <Monogram letter="E" size={44} />
          <div>
            <h2 className="text-lg font-semibold text-mist-100">Expenses</h2>
            <p className="text-sm text-mist-500">Swipe a charge between business and personal.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-safe-500/10 p-4">
            <p className="text-xs text-mist-500">Deductions captured</p>
            <p className="tabular mt-1 text-2xl font-bold text-safe-400">{money(deductionsYTD(state))}</p>
          </div>
          <div className="rounded-2xl bg-ink-700/40 p-4">
            <p className="text-xs text-mist-500">Tagged business</p>
            <p className="tabular mt-1 text-2xl font-bold text-mist-100">
              {businessCount}
              <span className="text-base font-normal text-mist-500">/{state.expenses.length}</span>
            </p>
          </div>
        </div>
      </section>

      {state.survivalMode && (
        <p className="rounded-2xl bg-ember-600/10 px-4 py-3 text-sm text-ember-400">
          Survival mode is hiding discretionary spending — essentials only.
        </p>
      )}

      {/* Dual-mode transaction list */}
      <section className="space-y-2.5">
        {visible.map((e) => {
          const isBusiness = e.mode === "business";
          const deduct = deductibleAmount(e);
          return (
            <div key={e.id} className="surface rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-mist-100">{e.merchant}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-mist-500">
                    <span>{shortDate(e.date)}</span>
                    <span>·</span>
                    <span className="truncate">{e.category}</span>
                    {e.discretionary && <Pill tone="muted">discretionary</Pill>}
                  </div>
                </div>
                <span className="tabular shrink-0 font-semibold text-mist-100">
                  {money(e.amount, { cents: true })}
                </span>
              </div>

              {/* Dual-mode toggle */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => toggleExpenseMode(e.id)}
                  className="relative flex h-8 w-40 items-center rounded-full bg-ink-900 p-0.5 text-xs font-medium"
                  role="switch"
                  aria-checked={isBusiness}
                >
                  <span
                    className={`absolute h-7 w-[76px] rounded-full transition-transform duration-200 ${
                      isBusiness ? "translate-x-0 bg-safe-500/25" : "translate-x-[80px] bg-ink-700"
                    }`}
                  />
                  <span className={`relative z-10 flex-1 text-center ${isBusiness ? "text-safe-400" : "text-mist-500"}`}>
                    Business
                  </span>
                  <span className={`relative z-10 flex-1 text-center ${!isBusiness ? "text-mist-100" : "text-mist-500"}`}>
                    Personal
                  </span>
                </button>
                {isBusiness ? (
                  <span className="tabular text-xs text-safe-400">
                    −{money(deduct, { cents: true })} deductible
                  </span>
                ) : (
                  <span className="text-xs text-mist-600">not deductible</span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Receipt scanner affordance */}
      <button className="surface flex w-full items-center gap-3 rounded-2xl border-dashed p-4 text-left transition hover:bg-ink-800">
        <Monogram letter="+" />
        <div>
          <p className="text-sm font-medium text-mist-100">Scan a receipt</p>
          <p className="text-xs text-mist-500">AI maps it to the right Schedule C line automatically.</p>
        </div>
      </button>
    </div>
  );
}
