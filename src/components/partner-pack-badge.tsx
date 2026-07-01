import { resolvePartnerPack } from "@/lib/partner-packs";

export function PartnerPackBadge({ tradingPartner }: { tradingPartner: string }) {
  const pack = resolvePartnerPack(tradingPartner);

  if (pack.id === "generic_retail") {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        Generic partner rules
      </span>
    );
  }

  return (
    <span
      className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-100"
      title={pack.notes}
    >
      {pack.name} rules · {pack.rules.length} checks
    </span>
  );
}
