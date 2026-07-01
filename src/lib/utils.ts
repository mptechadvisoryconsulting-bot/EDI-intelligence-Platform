import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function statusColor(status: string) {
  switch (status) {
    case "approved":
    case "complete":
      return "bg-emerald-100 text-emerald-800";
    case "in_review":
    case "review":
      return "bg-amber-100 text-amber-800";
    case "blocked":
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function confidenceColor(score: number) {
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.5) return "text-amber-600";
  return "text-red-600";
}
