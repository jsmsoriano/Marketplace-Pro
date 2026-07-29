"use client";

import { useFinance } from "./FinanceProvider";
import { Monogram, Pill } from "./ui";
import {
  Invoice,
  netOf,
  expectedIncome,
  paidIncomeYTD,
  daysUntil,
  shortDate,
  money,
} from "@/lib/finance";

function statusPill(inv: Invoice) {
  if (inv.status === "paid") return <Pill tone="safe">Paid</Pill>;
  if (inv.status === "overdue") {
    const late = -daysUntil(inv.dueOn);
    return <Pill tone="ember">{late}d overdue</Pill>;
  }
  const due = daysUntil(inv.dueOn);
  return <Pill tone="muted">Due in {due}d</Pill>;
}

export function IncomeView() {
  const { state, markInvoicePaid } = useFinance();

  const outstanding = state.invoices
    .filter((i) => i.status !== "paid")
    .sort((a, b) => daysUntil(a.dueOn) - daysUntil(b.dueOn));
  const paid = state.invoices.filter((i) => i.status === "paid");

  return (
    <div className="space-y-5">
      {/* Hero: money in motion */}
      <section className="animate-rise surface rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <Monogram letter="I" size={44} />
          <div>
            <h2 className="text-lg font-semibold text-mist-100">Invoices</h2>
            <p className="text-sm text-mist-500">Every invoice is a data point in your forecast.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-ember-600/10 p-4">
            <p className="text-xs text-mist-500">Expected (net of fees)</p>
            <p className="tabular mt-1 text-2xl font-bold text-ember-400">{money(expectedIncome(state))}</p>
          </div>
          <div className="rounded-2xl bg-safe-500/10 p-4">
            <p className="text-xs text-mist-500">Collected this year</p>
            <p className="tabular mt-1 text-2xl font-bold text-safe-400">{money(paidIncomeYTD(state))}</p>
          </div>
        </div>
      </section>

      {/* Outstanding */}
      <section className="space-y-3">
        <h3 className="px-1 text-sm font-medium text-mist-500">Outstanding · {outstanding.length}</h3>
        {outstanding.map((inv) => {
          const fee = inv.amount - netOf(inv);
          return (
            <div key={inv.id} className="surface rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-mist-100">{inv.clientName}</p>
                  <p className="mt-0.5 text-xs text-mist-500">
                    {inv.platform} · issued {shortDate(inv.issuedOn)}
                  </p>
                </div>
                {statusPill(inv)}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-xs text-mist-500">
                  <p className="tabular">
                    {money(inv.amount)} gross
                    {fee > 0 && <span className="text-ember-400"> · −{money(fee, { cents: true })} fee</span>}
                  </p>
                  <p className="tabular mt-0.5 text-sm font-semibold text-mist-100">
                    {money(netOf(inv), { cents: true })} net
                  </p>
                </div>
                <button
                  onClick={() => markInvoicePaid(inv.id)}
                  className="rounded-xl bg-safe-500/15 px-4 py-2 text-sm font-medium text-safe-400 transition hover:bg-safe-500/25 active:scale-[0.98]"
                >
                  Mark paid
                </button>
              </div>
              {inv.status === "overdue" && (
                <p className="mt-3 rounded-lg bg-ember-600/10 px-3 py-2 text-xs text-ember-400">
                  Auto-reminder queued — a nudge goes out today.
                </p>
              )}
            </div>
          );
        })}
        {outstanding.length === 0 && (
          <p className="surface rounded-2xl p-6 text-center text-sm text-mist-500">
            All caught up. Every invoice is paid. 🎉
          </p>
        )}
      </section>

      {/* Paid history */}
      {paid.length > 0 && (
        <section className="space-y-2">
          <h3 className="px-1 text-sm font-medium text-mist-500">Paid</h3>
          <div className="surface divide-y divide-ink-700 rounded-2xl">
            {paid.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-mist-100">{inv.clientName}</p>
                  <p className="text-xs text-mist-500">{shortDate(inv.issuedOn)}</p>
                </div>
                <span className="tabular text-sm font-medium text-safe-400">
                  +{money(netOf(inv))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
