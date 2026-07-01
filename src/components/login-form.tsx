"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-400/30">
            <BrainCircuit className="h-7 w-7 text-indigo-300" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            AI EDI Implementation Intelligence
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Understand requirements before you configure the translator
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in to workspace
          </button>
        </form>
      </div>
    </div>
  );
}
