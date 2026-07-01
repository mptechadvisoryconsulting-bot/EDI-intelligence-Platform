import { CONNECTION_PROTOCOLS, CONNECTION_PROVIDERS } from "./connections";

export function formatConnectionLabel(connectionType?: string | null, connectionProvider?: string | null) {
  if (!connectionType && !connectionProvider) return null;

  const protocol = CONNECTION_PROTOCOLS.find((p) => p.id === connectionType);
  const provider = CONNECTION_PROVIDERS.find((p) => p.id === connectionProvider);

  const parts = [provider?.name, protocol?.name].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : [connectionProvider, connectionType].filter(Boolean).join(" · ");
}

export function formatEdiVersionLabel(ediVersion?: string | null) {
  if (!ediVersion?.trim()) return null;
  return `X12 ${ediVersion.trim()}`;
}
