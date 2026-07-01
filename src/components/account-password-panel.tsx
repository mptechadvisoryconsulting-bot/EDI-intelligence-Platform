"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

export function AccountPasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not change password");
        return;
      }
      setMessage("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Request failed — check connection and try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-100">Change password</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">Minimum 12 characters. Applies to this account on all environments.</p>

      <form onSubmit={submit} className="mt-4 max-w-md space-y-3">
        <label className="block text-sm">
          <span className="text-slate-400">Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
            required
            autoComplete="current-password"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
    </section>
  );
}
