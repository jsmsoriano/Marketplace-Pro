"use client";

import { useState } from "react";
import { OptimizationResult } from "@/app/page";

interface Props {
  result: OptimizationResult;
  originalText: string;
  onReset: () => void;
}

type View = "optimized" | "original" | "changes";

export default function OptimizedResume({ result, originalText, onReset }: Props) {
  const [view, setView] = useState<View>("optimized");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.optimizedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.optimizedResume], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-optimized-${result.jobTitle.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor =
    result.matchScore >= 80
      ? "text-green-600 bg-green-50 border-green-200"
      : result.matchScore >= 60
      ? "text-yellow-600 bg-yellow-50 border-yellow-200"
      : "text-red-600 bg-red-50 border-red-200";

  const scoreBarColor =
    result.matchScore >= 80 ? "bg-green-500" : result.matchScore >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${scoreColor} col-span-1`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Match Score</p>
          <p className="text-3xl font-bold">{result.matchScore}%</p>
          <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${scoreBarColor} rounded-full transition-all duration-700`}
              style={{ width: `${result.matchScore}%` }}
            />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Target Role</p>
          <p className="text-lg font-bold text-slate-800 leading-tight">{result.jobTitle}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Changes Made</p>
          <p className="text-3xl font-bold text-slate-800">{result.changes.length}</p>
          <p className="text-xs text-slate-500">optimizations applied</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-wrap gap-3">
          <div className="flex gap-1">
            {(["optimized", "original", "changes"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                  view === v
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {v === "changes" ? `Changes (${result.changes.length})` : v}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download TXT
            </button>
          </div>
        </div>

        <div className="p-6">
          {view === "optimized" && (
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
              {result.optimizedResume}
            </pre>
          )}
          {view === "original" && (
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed opacity-70">
              {originalText}
            </pre>
          )}
          {view === "changes" && (
            <ul className="space-y-2">
              {result.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-700">{change}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all"
        >
          Optimize another resume
        </button>
      </div>
    </div>
  );
}
