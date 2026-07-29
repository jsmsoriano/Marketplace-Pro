"use client";

import { useFinance } from "./FinanceProvider";
import { Monogram, Meter, Pill } from "./ui";
import { clientProfitability, money } from "@/lib/finance";

export function ClientsView() {
  const { state } = useFinance();
  const rows = clientProfitability(state);
  const best = rows[0];

  return (
    <div className="space-y-5">
      <section className="animate-rise surface rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <Monogram letter="C" size={44} />
          <div>
            <h2 className="text-lg font-semibold text-mist-100">Client Profitability</h2>
            <p className="text-sm text-mist-500">Ranked by true profit, not just revenue.</p>
          </div>
        </div>
        {best && (
          <div className="mt-5 rounded-2xl bg-safe-500/10 p-4">
            <p className="text-xs text-mist-500">Your most profitable client</p>
            <p className="mt-1 text-lg font-semibold text-mist-100">{best.client.name}</p>
            <p className="tabular mt-0.5 text-sm text-safe-400">
              {money(best.trueProfit)} true profit · score {best.score}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        {rows.map((r) => {
          const scoreTone = r.score >= 70 ? "safe" : r.score >= 40 ? "warn" : "ember";
          const slow = r.client.avgPaymentDelayDays >= 14;
          const chatty = r.client.commHoursPerMonth >= 8;
          return (
            <div key={r.client.id} className="surface rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-mist-100">{r.client.name}</p>
                <Pill tone={scoreTone}>Score {r.score}</Pill>
              </div>

              <div className="mt-3">
                <Meter value={r.score} max={100} tone={r.score >= 40 ? "safe" : "ember"} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Net revenue" value={money(r.netRevenueYTD)} />
                <Stat label="Comm. cost" value={`−${money(r.commCostYTD)}`} tone="ember" />
                <Stat label="True profit" value={money(r.trueProfit)} tone={r.trueProfit >= 0 ? "safe" : "ember"} />
              </div>

              {(slow || chatty) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {slow && <Pill tone="ember">Pays ~{r.client.avgPaymentDelayDays}d late</Pill>}
                  {chatty && <Pill tone="warn">{r.client.commHoursPerMonth}h/mo unbilled comms</Pill>}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "safe" | "ember";
}) {
  const toneClass =
    tone === "safe" ? "text-safe-400" : tone === "ember" ? "text-ember-400" : "text-mist-100";
  return (
    <div className="rounded-xl bg-ink-900/60 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-mist-600">{label}</p>
      <p className={`tabular mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
