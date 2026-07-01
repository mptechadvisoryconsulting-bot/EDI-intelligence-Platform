import { NextResponse } from "next/server";
import { INDUSTRY_TRADING_PARTNERS } from "@/lib/industry/trading-partners";
import { listPartnerPacks } from "@/lib/partner-packs";

/** @deprecated Prefer /api/industry/catalog — kept for backward compatibility */
export async function GET() {
  const rulePacks = listPartnerPacks();
  const profiles = INDUSTRY_TRADING_PARTNERS.filter((p) => p.id !== "generic").map((p) => ({
    id: p.packId ?? p.id,
    name: p.name,
    retailer: p.name,
    category: p.category,
    ruleCount: rulePacks.find((r) => r.id === p.packId)?.rules.length ?? 0,
    label: `${p.name} (${p.category.replace(/_/g, " ")})`,
  }));

  return NextResponse.json({
    profiles,
    total: profiles.length,
    note: "Use /api/industry/catalog for full trading partner, transaction, and connection lists.",
  });
}
