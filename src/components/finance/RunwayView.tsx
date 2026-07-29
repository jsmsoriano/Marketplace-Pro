"use client";

import { useState } from "react";
import { useFinance } from "./FinanceProvider";
import { Monogram, RunwayRing, Pill } from "./ui";
import { AffordabilityModal } from "./AffordabilityModal";
import {
  safeToSpend,
  operatingCash,
  totalCash,
  runwayDays,
  projectedRunwayDays,
  expectedIncome,
  upcomingFixedCosts,
  taxOwedYTD,
  taxSetAside,
  money,
} from "@/lib/finance";

export function RunwayView() {
  const { state } = useFinance();
  const [askOpen, setAskOpen] = useState(false);

  const sts = safeToSpend(state);
  const runway = runwayDays(state);
  const projected = projectedRunwayDays(state);
  const unfundedTax = Math.max(0, taxOwedYTD(state) - taxSetAside(state));

  const drains = [
    { label: "Unfunded tax", value: unfundedTax },
    { label: "Fixed costs (30d)", value: upcomingFixedCosts(state) },
    { label: "Emergency buffer", value: state.settings.emergencyTarget },
  ];

  return (
    <div className="space-y-5">
      {/* Safe-to-Spend hero — the one number the whole app orbits. */}
      <section className="animate-rise surface overflow-hidden rounded-3xl p-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-mist-500">Safe to spend today</span>
          {state.survivalMode && <Pill tone="ember">Survival mode</Pill>}
        </div>
        <div className={`tabular text-5xl font-bold tracking-tight ${sts < 0 ? "text-ember-400" : "text-mist-100"}`}>
          {money(sts)}
        </div>
        <p className="mt-2 text-sm text-mist-500">
          {money(operatingCash(state))} cash, after taxes owed, upcoming bills and your safety net.
        </p>

        <button
          onClick={() => setAskOpen(true)}
          className="ember-gradient mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition active:scale-[0.99]"
        >
          <span className="font-mono text-lg">?</span> Can I afford this?
        </button>
      </section>

      {/* Runway ring */}
      <section className="surface flex items-center gap-5 rounded-3xl p-6">
        <RunwayRing days={runway}>
          <span className="tabular text-4xl font-bold text-mist-100">{runway}</span>
          <span className="text-xs uppercase tracking-wide text-mist-500">days runway</span>
        </RunwayRing>
        <div className="flex-1 space-y-3">
          <p className="text-sm text-mist-300">
            You can keep the lights on for{" "}
            <span className="font-semibold text-mist-100">{runway} days</span> with no new income.
          </p>
          <div className="rounded-2xl bg-safe-500/10 p-3">
            <div className="flex items-center gap-2 text-safe-400">
              <span className="tabular text-lg font-bold">{projected} days</span>
              <span className="text-xs">if invoices get paid</span>
            </div>
            <p className="mt-0.5 text-xs text-mist-500">
              {money(expectedIncome(state))} outstanding across your clients.
            </p>
          </div>
        </div>
      </section>

      {/* What's holding money back */}
      <section className="surface rounded-3xl p-5">
        <h3 className="mb-3 text-sm font-medium text-mist-500">What&apos;s held back from your balance</h3>
        <div className="space-y-3">
          {drains.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <span className="text-mist-300">{d.label}</span>
              <span className="tabular font-medium text-mist-100">−{money(d.value)}</span>
            </div>
          ))}
          <div className="mt-1 border-t border-ink-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-mist-500">Total cash on hand</span>
              <span className="tabular font-semibold text-mist-100">{money(totalCash(state))}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick module jump */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { l: "I", label: "Invoices", sub: money(expectedIncome(state)) },
          { l: "T", label: "Tax", sub: money(unfundedTax) + " owed" },
          { l: "C", label: "Clients", sub: `${state.clients.length} active` },
        ].map((m) => (
          <div key={m.label} className="surface flex flex-col items-center gap-2 rounded-2xl p-4">
            <Monogram letter={m.l} />
            <span className="text-xs font-medium text-mist-300">{m.label}</span>
            <span className="tabular text-[11px] text-mist-500">{m.sub}</span>
          </div>
        ))}
      </section>

      <AffordabilityModal open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}
