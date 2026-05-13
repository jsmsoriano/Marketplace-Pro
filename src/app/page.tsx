"use client";

import { useState } from "react";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import OptimizedResume from "@/components/OptimizedResume";
import StepIndicator from "@/components/StepIndicator";

export type Step = "upload" | "job" | "result";

export interface OptimizationResult {
  optimizedResume: string;
  changes: string[];
  jobTitle: string;
  matchScore: number;
}

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleResumeUploaded = (text: string, name: string) => {
    setResumeText(text);
    setFileName(name);
    setStep("job");
  };

  const handleOptimize = async (jobDescription: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Optimization failed");
      }
      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setResumeText("");
    setFileName("");
    setResult(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-800">ResumeMatch AI</span>
          </div>
          {step !== "upload" && (
            <button
              onClick={handleReset}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Optimize Your Resume for Any Job
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Upload your resume, paste a job description or link, and let AI restructure your resume to land that interview.
          </p>
        </div>

        <StepIndicator currentStep={step} />

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8">
          {step === "upload" && (
            <ResumeUpload onUploaded={handleResumeUploaded} />
          )}
          {step === "job" && (
            <JobDescriptionInput
              fileName={fileName}
              onOptimize={handleOptimize}
              isLoading={isLoading}
            />
          )}
          {step === "result" && result && (
            <OptimizedResume result={result} originalText={resumeText} onReset={handleReset} />
          )}
        </div>
      </main>
    </div>
  );
}
