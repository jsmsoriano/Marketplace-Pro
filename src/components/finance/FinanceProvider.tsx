"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import {
  FinanceState,
  Invoice,
  Expense,
  ExpenseMode,
  seedState,
  netOf,
} from "@/lib/finance";

interface FinanceContextValue {
  state: FinanceState;
  // Mutations
  markInvoicePaid: (id: string) => void;
  toggleExpenseMode: (id: string) => void;
  setTaxRate: (pct: number) => void;
  setEmergencyTarget: (amount: number) => void;
  toggleSurvivalMode: () => void;
  moveToTaxVault: (amount: number) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(seedState);

  const value = useMemo<FinanceContextValue>(() => {
    return {
      state,

      markInvoicePaid: (id) =>
        setState((s) => {
          const invoice = s.invoices.find((i) => i.id === id);
          if (!invoice || invoice.status === "paid") return s;
          const net = netOf(invoice);
          return {
            ...s,
            invoices: s.invoices.map((i): Invoice =>
              i.id === id ? { ...i, status: "paid" } : i
            ),
            // The cash lands in Operating Checking.
            accounts: s.accounts.map((a) =>
              a.id === "a1" ? { ...a, balance: a.balance + net } : a
            ),
          };
        }),

      toggleExpenseMode: (id) =>
        setState((s) => ({
          ...s,
          expenses: s.expenses.map((e): Expense => {
            if (e.id !== id) return e;
            const nextMode: ExpenseMode =
              e.mode === "business" ? "personal" : "business";
            return {
              ...e,
              mode: nextMode,
              category: nextMode === "personal" ? "Personal" : "Software & Subscriptions",
            };
          }),
        })),

      setTaxRate: (pct) =>
        setState((s) => ({
          ...s,
          settings: { ...s.settings, taxRatePct: Math.max(0, Math.min(60, pct)) },
        })),

      setEmergencyTarget: (amount) =>
        setState((s) => ({
          ...s,
          settings: { ...s.settings, emergencyTarget: Math.max(0, amount) },
        })),

      toggleSurvivalMode: () =>
        setState((s) => ({ ...s, survivalMode: !s.survivalMode })),

      moveToTaxVault: (amount) =>
        setState((s) => {
          const checking = s.accounts.find((a) => a.id === "a1");
          const move = Math.max(0, Math.min(amount, checking?.balance ?? 0));
          if (move <= 0) return s;
          return {
            ...s,
            accounts: s.accounts.map((a) => {
              if (a.id === "a1") return { ...a, balance: a.balance - move };
              if (a.id === "a2") return { ...a, balance: a.balance + move };
              return a;
            }),
          };
        }),
    };
  }, [state]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within a FinanceProvider");
  return ctx;
}
