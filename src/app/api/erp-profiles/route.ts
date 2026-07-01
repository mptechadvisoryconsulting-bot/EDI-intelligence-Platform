import { NextResponse } from "next/server";
import { listErpProfiles } from "@/lib/erp-profiles";

export async function GET() {
  const profiles = listErpProfiles().map((p) => ({
    id: p.id,
    name: p.name,
    vendor: p.vendor,
    category: p.category,
    label: `${p.name} (${p.vendor})`,
  }));

  return NextResponse.json({
    profiles,
    total: profiles.length,
    note: "Any ERP not listed can be entered as custom — upload a source field list for mapping.",
  });
}
