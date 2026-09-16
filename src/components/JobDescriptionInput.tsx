"use client";

import { useState } from "react";

interface Props {
  fileName: string;
  onOptimize: (jobDescription: string) => void;
  isLoading: boolean;
}

type InputMode = "paste" | "url";

export default function JobDescriptionInput({ fileName, onOptimize, isLoading }: Props) {
  const [mode, setMode] = useState<InputMode>("paste");
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [fetchedNotice, setFetchedNotice] = useState(false);

  const handleFetchUrl = async () => {
    if (!jobUrl.trim()) return;
    setIsFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch job description");
      }
      const { text } = await res.json();
      setJobText(text);
      setFetchedNotice(true);
      setMode("paste");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch URL");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = () => {
    const description = jobText.trim();
    if (!description) return;
    onOptimize(description);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Resume loaded</p>
            <p className="text-xs text-slate-500">{fileName}</p>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Add the Job Description
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Paste the job posting text or provide a URL to the job listing.
          </p>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode("paste")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === "paste"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setMode("url")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                mode === "url"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Job URL
            </button>
          </div>

          {mode === "url" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://jobs.example.com/software-engineer"
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={isFetching || !jobUrl.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isFetching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Fetch"
                  )}
                </button>
              </div>
              {fetchError && (
                <p className="text-xs text-red-600">{fetchError}</p>
              )}
              {jobText && !fetchError && (
                <p className="text-xs text-slate-500">
                  Fetched text is available in the Paste Text tab.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {fetchedNotice && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  Job description fetched from URL. Review it below, then optimize.
                </div>
              )}
              <textarea
                value={jobText}
                onChange={(e) => {
                  setJobText(e.target.value);
                  setFetchedNotice(false);
                }}
                placeholder="Paste the full job description here — include the title, responsibilities, requirements, and skills..."
                className="w-full h-48 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {jobText.length > 0 ? `${jobText.length} characters` : "The more detail, the better the optimization"}
            </p>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !jobText.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Optimize Resume
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-blue-700">AI is optimizing your resume...</p>
          </div>
          <div className="space-y-1.5">
            {[
              "Analyzing job requirements and keywords",
              "Reordering bullet points for relevance",
              "Updating skills and technologies",
              "Reformatting for ATS compatibility",
            ].map((step) => (
              <div key={step} className="flex items-center gap-2 text-xs text-blue-600">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                {step}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
