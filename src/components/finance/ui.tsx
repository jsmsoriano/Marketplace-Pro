"use client";

import { ReactNode, useEffect } from "react";

/**
 * Monogram — the symbolic single-letter icon tile the design proposal calls for
 * ("T" for Tax, "I" for Invoices) instead of emoji. Uppercase, mono, on a
 * subtle tile that can go ember when it needs to signal urgency.
 */
export function Monogram({
  letter,
  active = false,
  urgent = false,
  size = 40,
}: {
  letter: string;
  active?: boolean;
  urgent?: boolean;
  size?: number;
}) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-xl font-mono font-semibold select-none",
        urgent
          ? "ember-gradient text-white"
          : active
          ? "bg-mist-100 text-ink-950"
          : "bg-ink-700/60 text-mist-300",
      ].join(" ")}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

/** Slim horizontal meter used for tax funding, savings targets, etc. */
export function Meter({
  value,
  max,
  tone = "safe",
}: {
  value: number;
  max: number;
  tone?: "safe" | "ember";
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700/70">
      <div
        className={tone === "ember" ? "h-full rounded-full ember-gradient" : "h-full rounded-full bg-safe-500"}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Circular gauge for the runway hero. */
export function RunwayRing({
  days,
  max = 90,
  children,
}: {
  days: number;
  max?: number;
  children: ReactNode;
}) {
  const size = 176;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, days / max));
  const dash = circ * pct;
  // Ember when runway is short, safe green when it's healthy.
  const short = days < 30;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(52,70,90,0.45)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={short ? "url(#ember)" : "url(#safe)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
        />
        <defs>
          <linearGradient id="ember" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff8a3d" />
            <stop offset="100%" stopColor="#d92626" />
          </linearGradient>
          <linearGradient id="safe" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34e0a1" />
            <stop offset="100%" stopColor="#10c98a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "safe" | "ember" | "warn";
}) {
  const tones: Record<string, string> = {
    muted: "bg-ink-700/60 text-mist-300",
    safe: "bg-safe-500/15 text-safe-400",
    ember: "bg-ember-600/15 text-ember-400",
    warn: "bg-amber-500/15 text-amber-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Mobile bottom-sheet used for detail / affordability flows. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-sheet surface relative w-full rounded-t-3xl p-5 pb-7">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-600" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-mist-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-ink-700/60 px-3 py-1 text-sm text-mist-300 hover:text-mist-100"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
