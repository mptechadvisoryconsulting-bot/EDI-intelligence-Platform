import { NextResponse } from "next/server";
import { listPartnerPacks } from "@/lib/partner-packs";

export async function GET() {
  const profiles = listPartnerPacks().map((p) => ({
    id: p.id,
    name: p.name,
    retailer: p.retailer,
    category: p.category,
    ruleCount: p.rules.length,
    label: `${p.name} (${p.category.replace(/_/g, " ")})`,
  }));

  return NextResponse.json({
    profiles,
    total: profiles.length,
    note: "Partner packs add retailer-specific rules, certification checklists, and EDI sample validation.",
  });
}
