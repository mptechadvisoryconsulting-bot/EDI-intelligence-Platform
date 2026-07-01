import { NextResponse } from "next/server";
import {
  B2B_TRANSLATOR_PLATFORMS,
  CONNECTION_PROTOCOLS,
  CONNECTION_PROVIDERS,
  INDUSTRY_TRADING_PARTNERS,
  INDUSTRY_TRANSACTION_SETS,
} from "@/lib/industry";
import { listErpProfiles } from "@/lib/erp-profiles";
import { listPartnerPacks } from "@/lib/partner-packs";

export async function GET() {
  const rulePacks = listPartnerPacks();
  const partners = INDUSTRY_TRADING_PARTNERS.map((p) => ({
    ...p,
    hasRulePack: rulePacks.some((r) => r.id === p.packId),
  }));

  return NextResponse.json({
    tradingPartners: partners,
    transactionSets: INDUSTRY_TRANSACTION_SETS,
    connectionProtocols: CONNECTION_PROTOCOLS,
    connectionProviders: CONNECTION_PROVIDERS,
    translatorPlatforms: B2B_TRANSLATOR_PLATFORMS,
    erpSystems: listErpProfiles().map((e) => ({
      id: e.id,
      name: e.name,
      vendor: e.vendor,
      category: e.category,
    })),
    stats: {
      partners: partners.length,
      transactionSets: INDUSTRY_TRANSACTION_SETS.length,
      implementedPacks: INDUSTRY_TRANSACTION_SETS.filter((t) => t.implemented).length,
      erpSystems: listErpProfiles().length,
    },
  });
}
