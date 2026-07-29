"use client";

import { useState } from "react";
import { useFinance } from "./FinanceProvider";
import { RunwayView } from "./RunwayView";
import { IncomeView } from "./IncomeView";
import { TaxView } from "./TaxView";
import { SpendingView } from "./SpendingView";
import { ClientsView } from "./ClientsView";
import { onTrack, capsOverCount } from "@/lib/finance";

type Tab = "runway" | "income" | "tax" | "spending" | "clients";

const TABS: { id: Tab; label: string; letter: string }[] = [
  { id: "runway", label: "Runway", letter: "R" },
  { id: "income", label: "Invoices", letter: "I" },
  { id: "tax", label: "Tax", letter: "T" },
  { id: "spending", label: "Spending", letter: "S" },
  { id: "clients", label: "Clients", letter: "C" },
];

export function AppShell() {
  const { state, toggleSurvivalMode } = useFinance();
  const [tab, setTab] = useState<Tab>("runway");

  const track = onTrack(state);
  const overCaps = capsOverCount(state);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden md:my-6 md:min-h-0 md:rounded-[2.5rem] md:border md:border-ink-700 md:shadow-2xl md:shadow-black/40">
      {/* Status strip — echoes the Capline "STRICT MODE · ON TRACK" bar. */}
      <div
        className={`flex items-center justify-between px-5 py-1.5 text-[11px] font-semibold tracking-wide text-white ${
          track ? "status-ontrack" : "ember-gradient"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
          {state.survivalMode ? "STRICT MODE" : "STANDARD"}
        </span>
        <span>
          {track ? "ON TRACK" : "OFF TRACK"}
          {overCaps > 0 && <span className="font-normal text-white/80"> · {overCaps} over cap</span>}
        </span>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-3 pt-4">
        <div>
          <p className="text-xs text-mist-500">{state.personaTrade}</p>
          <h1 className="text-lg font-semibold text-mist-100">
            Hi, {state.personaName.split(" ")[0]}
          </h1>
        </div>
        {/* Strict Mode — one tap hides discretionary spend and tightens runway. */}
        <button
          onClick={toggleSurvivalMode}
          className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition ${
            state.survivalMode
              ? "brand-gradient text-white"
              : "border border-ink-700 text-mist-300 hover:bg-ink-800"
          }`}
          aria-pressed={state.survivalMode}
        >
          <span className={`h-2 w-2 rounded-full ${state.survivalMode ? "bg-white" : "bg-mist-600"}`} />
          Strict Mode
        </button>
      </header>

      {/* Active view */}
      <main key={tab} className="no-scrollbar flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {tab === "runway" && <RunwayView />}
        {tab === "income" && <IncomeView />}
        {tab === "tax" && <TaxView />}
        {tab === "spending" && <SpendingView />}
        {tab === "clients" && <ClientsView />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md md:absolute md:rounded-b-[2.5rem]">
        <div className="surface m-3 flex items-center justify-between rounded-2xl px-2 py-2">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-semibold transition ${
                    active ? "bg-mist-100 text-ink-950" : "text-mist-500"
                  }`}
                >
                  {t.letter}
                </span>
                <span className={`text-[10px] ${active ? "text-mist-100" : "text-mist-600"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
