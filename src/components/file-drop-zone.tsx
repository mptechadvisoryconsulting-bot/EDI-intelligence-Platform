"use client";

import { useCallback, useRef, useState } from "react";
import { Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropZone({
  onFiles,
  accept,
  disabled,
  label,
  hint,
  className,
}: {
  onFiles: (files: FileList) => void;
  accept?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length || disabled) return;
      onFiles(files);
    },
    [disabled, onFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition duration-200",
          dragging
            ? "border-cyan-400/60 bg-cyan-500/10 ai-glow-border"
            : "border-slate-700/60 bg-slate-900/40 hover:border-indigo-500/40 hover:bg-indigo-500/5",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <div
          className={cn(
            "mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition",
            dragging ? "bg-cyan-500/20" : "bg-indigo-500/10 group-hover:bg-indigo-500/20"
          )}
        >
          {dragging ? (
            <Sparkles className="h-6 w-6 text-cyan-400 ai-pulse" />
          ) : (
            <Upload className="h-6 w-6 text-indigo-400" />
          )}
        </div>
        <p className="text-sm font-medium text-slate-200">
          {label ?? "Drop files here or click to browse"}
        </p>
        {hint && <p className="mt-1.5 max-w-md text-xs text-slate-500">{hint}</p>}
      </div>
    </>
  );
}
