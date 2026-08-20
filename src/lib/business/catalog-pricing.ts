export type CatalogPriceAuditInput = {
  sku: string;
  oldUnitPriceMinor: number | null;
  newUnitPriceMinor: number;
  oldActive: boolean | null;
  newActive: boolean;
};

export function buildCatalogPriceAuditMetadata(input: CatalogPriceAuditInput) {
  return {
    sku: input.sku,
    oldUnitPriceMinor: input.oldUnitPriceMinor,
    newUnitPriceMinor: input.newUnitPriceMinor,
    priceChanged: input.oldUnitPriceMinor !== null && input.oldUnitPriceMinor !== input.newUnitPriceMinor,
    oldActive: input.oldActive,
    newActive: input.newActive,
    activeChanged: input.oldActive !== null && input.oldActive !== input.newActive,
  };
}
