"use client";

import { useCallback, useState } from "react";

interface Props {
  onUploaded: (text: string, fileName: string) => void;
}

export default function ResumeUpload({ onUploaded }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const processFile = useCallback(
    async (file: File) => {
      setError("");
      if (!file.name.match(/\.(pdf|docx|txt)$/i)) {
        setError("Please upload a PDF, DOCX, or TXT file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File must be under 10MB.");
        return;
      }

      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to parse resume");
        }
        const { text } = await res.json();
        onUploaded(text, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
      } finally {
        setIsProcessing(false);
      }
    },
    [onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileInput}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 font-medium">Parsing your resume...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-700">
                Drop your resume here, or click to browse
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Supports PDF, DOCX, and TXT — up to 10MB
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["PDF", "DOCX", "TXT"].map((fmt) => (
                <span key={fmt} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { icon: "🎯", title: "ATS Optimized", desc: "Pass applicant tracking systems" },
          { icon: "⚡", title: "Instant Results", desc: "AI optimization in seconds" },
          { icon: "🔒", title: "Not stored here", desc: "Parsed in memory; sent to Anthropic to rewrite" },
        ].map((f) => (
          <div key={f.title} className="text-center p-4 bg-white rounded-xl border border-slate-100">
            <div className="text-2xl mb-2">{f.icon}</div>
            <p className="text-sm font-semibold text-slate-700">{f.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
