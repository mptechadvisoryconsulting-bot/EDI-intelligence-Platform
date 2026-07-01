"use client";

import { useEffect, useState } from "react";

type Protocol = { id: string; name: string; description: string };
type Provider = { id: string; name: string; type: string; protocols: string[] };

export function ConnectionSetupPicker({
  connectionType,
  connectionProvider,
  onChange,
}: {
  connectionType: string;
  connectionProvider: string;
  onChange: (type: string, provider: string) => void;
}) {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    fetch("/api/industry/catalog")
      .then((r) => r.json())
      .then((data) => {
        setProtocols(data.connectionProtocols ?? []);
        setProviders(data.connectionProviders ?? []);
      })
      .catch(() => {});
  }, []);

  const filteredProviders = connectionType
    ? providers.filter((p) => p.protocols.includes(connectionType))
    : providers;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Connection protocol</span>
        <select
          value={connectionType}
          onChange={(e) => onChange(e.target.value, connectionProvider)}
          required
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Select protocol...</option>
          {protocols.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {connectionType && (
          <p className="mt-1 text-xs text-slate-500">
            {protocols.find((p) => p.id === connectionType)?.description}
          </p>
        )}
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">VAN / B2B provider</span>
        <select
          value={connectionProvider}
          onChange={(e) => onChange(connectionType, e.target.value)}
          required
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Select provider...</option>
          {filteredProviders.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          IBM Sterling Commerce/VAN, Cleo, SPS Commerce, TrueCommerce, direct AS2/SFTP, etc.
        </p>
      </label>
    </div>
  );
}
