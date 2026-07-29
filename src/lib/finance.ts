// The Solopreneur Engine — core financial model.
//
// This module is pure TypeScript (no React, no "use client", no "server-only")
// so it can be imported by client components AND by server route handlers.
// It holds the seed data, the domain types, and the calculation functions that
// turn raw accounts / invoices / expenses into the derived numbers the UI shows
// (Safe-to-Spend, runway, tax quarantine, client profitability).

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface Account {
  id: string;
  name: string;
  kind: "checking" | "savings";
  balance: number;
}

export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid";

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  amount: number; // gross, before platform fee
  platform: "Stripe" | "Upwork" | "Direct" | "PayPal";
  platformFeePct: number; // e.g. 0.029 for Stripe
  status: InvoiceStatus;
  issuedOn: string; // ISO date
  dueOn: string; // ISO date
}

export type ExpenseMode = "business" | "personal";

// A subset of IRS Schedule C deduction lines, kept human-readable.
export type ScheduleCCategory =
  | "Software & Subscriptions"
  | "Advertising"
  | "Contract Labor"
  | "Office & Supplies"
  | "Travel"
  | "Meals (50%)"
  | "Home Office"
  | "Equipment"
  | "Personal";

export interface Expense {
  id: string;
  merchant: string;
  amount: number;
  date: string; // ISO date
  mode: ExpenseMode;
  category: ScheduleCCategory;
  discretionary: boolean; // hidden by the Survival Toggle
}

export type FixedCadence = "monthly" | "quarterly" | "annual";

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  cadence: FixedCadence;
  mode: ExpenseMode;
  essential: boolean; // survives the Survival Toggle
  nextDueOn: string; // ISO date
}

export interface Client {
  id: string;
  name: string;
  // Signals that feed the Client Profitability Score.
  commHoursPerMonth: number; // unbilled time spent communicating
  avgPaymentDelayDays: number; // history of paying late
  billedRatePerHour: number; // effective billed rate on delivered work
}

export interface Settings {
  taxRatePct: number; // effective set-aside rate, e.g. 30
  emergencyTarget: number; // cash cushion to protect
  shadowHourlyCost: number; // opportunity cost of an unbilled hour
}

export interface FinanceState {
  personaName: string;
  personaTrade: string;
  accounts: Account[];
  invoices: Invoice[];
  expenses: Expense[];
  fixedCosts: FixedCost[];
  clients: Client[];
  settings: Settings;
  survivalMode: boolean;
}

// ----------------------------------------------------------------------------
// Seed data — a freelance brand & product designer, mid-quarter.
// "Today" for the demo is anchored to 2026-07-29 to match the working session.
// ----------------------------------------------------------------------------

export const TODAY = new Date("2026-07-29T12:00:00");

export function seedState(): FinanceState {
  return {
    personaName: "Maya Okafor",
    personaTrade: "Brand & Product Designer",
    accounts: [
      { id: "a1", name: "Operating Checking", kind: "checking", balance: 9600 },
      { id: "a2", name: "Tax Vault", kind: "savings", balance: 1800 },
    ],
    invoices: [
      {
        id: "inv-108",
        clientId: "c1",
        clientName: "Northwind Studio",
        amount: 4800,
        platform: "Stripe",
        platformFeePct: 0.029,
        status: "sent",
        issuedOn: "2026-07-18",
        dueOn: "2026-08-01",
      },
      {
        id: "inv-107",
        clientId: "c2",
        clientName: "Halcyon Coffee",
        amount: 2200,
        platform: "Direct",
        platformFeePct: 0,
        status: "overdue",
        issuedOn: "2026-06-20",
        dueOn: "2026-07-05",
      },
      {
        id: "inv-106",
        clientId: "c3",
        clientName: "Upwork — Terra App",
        amount: 3600,
        platform: "Upwork",
        platformFeePct: 0.1,
        status: "sent",
        issuedOn: "2026-07-22",
        dueOn: "2026-08-12",
      },
      {
        id: "inv-105",
        clientId: "c1",
        clientName: "Northwind Studio",
        amount: 5200,
        platform: "Stripe",
        platformFeePct: 0.029,
        status: "paid",
        issuedOn: "2026-06-01",
        dueOn: "2026-06-15",
      },
      {
        id: "inv-104",
        clientId: "c4",
        clientName: "Bright Labs",
        amount: 2750,
        platform: "PayPal",
        platformFeePct: 0.034,
        status: "paid",
        issuedOn: "2026-05-12",
        dueOn: "2026-05-26",
      },
      {
        id: "inv-103",
        clientId: "c2",
        clientName: "Halcyon Coffee",
        amount: 1800,
        platform: "Direct",
        platformFeePct: 0,
        status: "paid",
        issuedOn: "2026-05-02",
        dueOn: "2026-05-16",
      },
    ],
    expenses: [
      { id: "e1", merchant: "Adobe Creative Cloud", amount: 59.99, date: "2026-07-24", mode: "business", category: "Software & Subscriptions", discretionary: false },
      { id: "e2", merchant: "Figma", amount: 45, date: "2026-07-20", mode: "business", category: "Software & Subscriptions", discretionary: false },
      { id: "e3", merchant: "WeWork Day Pass", amount: 29, date: "2026-07-19", mode: "business", category: "Office & Supplies", discretionary: true },
      { id: "e4", merchant: "Client Lunch — Terra", amount: 64.5, date: "2026-07-17", mode: "business", category: "Meals (50%)", discretionary: false },
      { id: "e5", merchant: "Whole Foods", amount: 112.34, date: "2026-07-16", mode: "personal", category: "Personal", discretionary: false },
      { id: "e6", merchant: "Amazon — Wacom pen", amount: 89, date: "2026-07-14", mode: "business", category: "Equipment", discretionary: false },
      { id: "e7", merchant: "Spotify", amount: 11.99, date: "2026-07-12", mode: "personal", category: "Personal", discretionary: true },
      { id: "e8", merchant: "Delta — SFO→PDX (conf.)", amount: 218, date: "2026-07-09", mode: "business", category: "Travel", discretionary: true },
      { id: "e9", merchant: "Google Workspace", amount: 12, date: "2026-07-05", mode: "business", category: "Software & Subscriptions", discretionary: false },
      { id: "e10", merchant: "Sweetgreen", amount: 17.25, date: "2026-07-27", mode: "personal", category: "Personal", discretionary: true },
    ],
    fixedCosts: [
      { id: "f1", name: "Rent", amount: 2100, cadence: "monthly", mode: "personal", essential: true, nextDueOn: "2026-08-01" },
      { id: "f2", name: "Health Insurance", amount: 420, cadence: "monthly", mode: "personal", essential: true, nextDueOn: "2026-08-01" },
      { id: "f3", name: "Phone + Internet", amount: 130, cadence: "monthly", mode: "business", essential: true, nextDueOn: "2026-08-04" },
      { id: "f4", name: "Software stack", amount: 128, cadence: "monthly", mode: "business", essential: false, nextDueOn: "2026-08-10" },
      { id: "f5", name: "Groceries (avg)", amount: 520, cadence: "monthly", mode: "personal", essential: true, nextDueOn: "2026-08-01" },
    ],
    clients: [
      { id: "c1", name: "Northwind Studio", commHoursPerMonth: 3, avgPaymentDelayDays: 2, billedRatePerHour: 145 },
      { id: "c2", name: "Halcyon Coffee", commHoursPerMonth: 9, avgPaymentDelayDays: 22, billedRatePerHour: 85 },
      { id: "c3", name: "Upwork — Terra App", commHoursPerMonth: 5, avgPaymentDelayDays: 6, billedRatePerHour: 110 },
      { id: "c4", name: "Bright Labs", commHoursPerMonth: 2, avgPaymentDelayDays: 1, billedRatePerHour: 130 },
    ],
    settings: {
      taxRatePct: 30,
      // The cushion kept inside checking that Safe-to-Spend refuses to touch.
      emergencyTarget: 3000,
      shadowHourlyCost: 95,
    },
    survivalMode: false,
  };
}

// ----------------------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------------------

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function daysUntil(iso: string): number {
  return daysBetween(TODAY, new Date(iso + "T12:00:00"));
}

// ----------------------------------------------------------------------------
// Derived calculations — the heart of the engine.
// ----------------------------------------------------------------------------

export function netOf(invoice: Invoice): number {
  return invoice.amount * (1 - invoice.platformFeePct);
}

/** Cash sitting in checking + savings right now. */
export function totalCash(s: FinanceState): number {
  return s.accounts.reduce((sum, a) => sum + a.balance, 0);
}

/** Spendable cash — checking only. The Tax Vault is quarantined, not deployable. */
export function operatingCash(s: FinanceState): number {
  return s.accounts
    .filter((a) => a.kind === "checking")
    .reduce((sum, a) => sum + a.balance, 0);
}

/** Net income from invoices already paid this year. */
export function paidIncomeYTD(s: FinanceState): number {
  return s.invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + netOf(i), 0);
}

/** Business deductions booked this year. */
export function deductionsYTD(s: FinanceState): number {
  return s.expenses
    .filter((e) => e.mode === "business")
    .reduce((sum, e) => sum + deductibleAmount(e), 0);
}

/** Meals are only 50% deductible; everything else business is full. */
export function deductibleAmount(e: Expense): number {
  if (e.mode !== "business") return 0;
  return e.category === "Meals (50%)" ? e.amount * 0.5 : e.amount;
}

export function taxableProfitYTD(s: FinanceState): number {
  return Math.max(0, paidIncomeYTD(s) - deductionsYTD(s));
}

/** What the freelancer should have quarantined for taxes so far. */
export function taxOwedYTD(s: FinanceState): number {
  return taxableProfitYTD(s) * (s.settings.taxRatePct / 100);
}

/** How much is actually parked in the Tax Vault. */
export function taxSetAside(s: FinanceState): number {
  return s.accounts.find((a) => a.id === "a2")?.balance ?? 0;
}

/** Net income still expected from sent/overdue invoices. */
export function expectedIncome(s: FinanceState): number {
  return s.invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + netOf(i), 0);
}

/** Fixed costs coming due within the next 30 days. */
export function upcomingFixedCosts(s: FinanceState, windowDays = 30): number {
  return s.fixedCosts
    .filter((f) => f.cadence === "monthly")
    .filter((f) => {
      const d = daysUntil(f.nextDueOn);
      return d >= 0 && d <= windowDays;
    })
    .filter((f) => !s.survivalMode || f.essential)
    .reduce((sum, f) => sum + f.amount, 0);
}

/**
 * Safe-to-Spend: the single number the whole app is built around.
 * Operating cash, minus the tax you still owe but haven't quarantined,
 * minus fixed costs about to hit, minus the emergency cushion.
 */
export function safeToSpend(s: FinanceState): number {
  const unfundedTax = Math.max(0, taxOwedYTD(s) - taxSetAside(s));
  return (
    operatingCash(s) -
    unfundedTax -
    upcomingFixedCosts(s) -
    s.settings.emergencyTarget
  );
}

/** Average money leaving each day to keep the lights on. */
export function dailyBurn(s: FinanceState): number {
  const monthlyFixed = s.fixedCosts
    .filter((f) => f.cadence === "monthly")
    .filter((f) => !s.survivalMode || f.essential)
    .reduce((sum, f) => sum + f.amount, 0);

  // Rolling personal/discretionary spend outside of fixed costs.
  const variable = s.expenses
    .filter((e) => e.mode === "personal")
    .filter((e) => !s.survivalMode || !e.discretionary)
    .reduce((sum, e) => sum + e.amount, 0);

  return monthlyFixed / 30 + variable / 30;
}

/** Days of survival on protected cash if no new money arrives. */
export function runwayDays(s: FinanceState): number {
  const burn = dailyBurn(s);
  if (burn <= 0) return 999;
  const protectedCash = operatingCash(s) - Math.max(0, taxOwedYTD(s) - taxSetAside(s));
  return Math.max(0, Math.floor(protectedCash / burn));
}

/** Runway if every outstanding invoice gets paid. */
export function projectedRunwayDays(s: FinanceState): number {
  const burn = dailyBurn(s);
  if (burn <= 0) return 999;
  const cash =
    operatingCash(s) +
    expectedIncome(s) -
    Math.max(0, taxOwedYTD(s) - taxSetAside(s));
  return Math.max(0, Math.floor(cash / burn));
}

// ----------------------------------------------------------------------------
// Client Profitability Score — revenue adjusted for the cost of the relationship.
// ----------------------------------------------------------------------------

export interface ClientProfitability {
  client: Client;
  netRevenueYTD: number;
  commCostYTD: number; // unbilled communication time, valued at shadow rate
  delayPenalty: number; // 0..1, how much late payment drags the score
  trueProfit: number;
  score: number; // 0..100
}

export function clientProfitability(s: FinanceState): ClientProfitability[] {
  const rows = s.clients.map((client) => {
    const netRevenueYTD = s.invoices
      .filter((i) => i.clientId === client.id && i.status === "paid")
      .reduce((sum, i) => sum + netOf(i), 0);

    // Communication happens year-round; approximate at ~6 months of history.
    const commCostYTD = client.commHoursPerMonth * s.settings.shadowHourlyCost * 6;
    const trueProfit = netRevenueYTD - commCostYTD;

    // Late payers erode runway predictability — penalize up to ~40%.
    const delayPenalty = Math.min(0.4, client.avgPaymentDelayDays / 60);

    return { client, netRevenueYTD, commCostYTD, delayPenalty, trueProfit };
  });

  const maxProfit = Math.max(1, ...rows.map((r) => r.trueProfit));

  return rows
    .map((r) => ({
      ...r,
      score: Math.round(
        Math.max(0, Math.min(100, (r.trueProfit / maxProfit) * 100 * (1 - r.delayPenalty)))
      ),
    }))
    .sort((a, b) => b.score - a.score);
}

// ----------------------------------------------------------------------------
// Formatting
// ----------------------------------------------------------------------------

export function money(n: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const { cents = false, sign = false } = opts;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(Math.abs(n));
  const prefix = n < 0 ? "−" : sign ? "+" : "";
  return prefix + formatted;
}

export function shortDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
