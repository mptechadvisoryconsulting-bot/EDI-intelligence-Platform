/** Trading partners — retail, grocery, distribution (industry reference catalog) */

export type TradingPartnerCatalogEntry = {
  id: string;
  name: string;
  category: "big_box" | "grocery" | "ecommerce" | "pharmacy" | "distribution" | "specialty" | "general";
  portal?: string;
  portalUrl?: string;
  typicalTransactions: string[];
  typicalConnections: string[];
  ediVersions?: string[];
  packId?: string;
  searchTerms: string[];
  notes?: string;
};

export const INDUSTRY_TRADING_PARTNERS: TradingPartnerCatalogEntry[] = [
  {
    id: "walmart",
    name: "Walmart",
    category: "big_box",
    portal: "Retail Link",
    portalUrl: "https://retaillink.wal-mart.com/",
    typicalTransactions: ["850", "855", "856", "810", "997", "846"],
    typicalConnections: ["AS2", "VAN (IBM Sterling)", "SFTP"],
    ediVersions: ["4010", "5010"],
    packId: "walmart",
    searchTerms: ["walmart", "wal-mart", "wmt"],
    notes: "ASN and label compliance critical — OTIF scorecards.",
  },
  {
    id: "target",
    name: "Target",
    category: "big_box",
    portal: "Partners Online (TPO)",
    portalUrl: "https://partners.target.com/",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["AS2", "VAN"],
    ediVersions: ["5010"],
    packId: "target",
    searchTerms: ["target", "tgt"],
  },
  {
    id: "amazon",
    name: "Amazon Vendor Central",
    category: "ecommerce",
    portal: "Vendor Central",
    portalUrl: "https://vendorcentral.amazon.com/",
    typicalTransactions: ["850", "855", "856", "810", "846", "997"],
    typicalConnections: ["AS2", "VAN", "API (SP-API hybrid)"],
    packId: "amazon",
    searchTerms: ["amazon", "vendor central", "avc", "amazon retail"],
  },
  {
    id: "costco",
    name: "Costco",
    category: "big_box",
    portal: "Vendor Hub",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN (SPS Commerce common)", "AS2"],
    packId: "costco",
    searchTerms: ["costco"],
  },
  {
    id: "homedepot",
    name: "The Home Depot",
    category: "big_box",
    portal: "Supplier Hub",
    typicalTransactions: ["850", "855", "856", "810", "860", "997"],
    typicalConnections: ["AS2", "VAN"],
    ediVersions: ["4010", "5010"],
    packId: "homedepot",
    searchTerms: ["home depot", "homedepot", "thd"],
  },
  {
    id: "lowes",
    name: "Lowe's",
    category: "big_box",
    portal: "Lowe's Vendor Gateway",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["AS2", "VAN"],
    packId: "lowes",
    searchTerms: ["lowes", "lowe's"],
  },
  {
    id: "kroger",
    name: "Kroger",
    category: "grocery",
    portal: "Webgate+",
    portalUrl: "https://webgate.kroger.com/",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["VAN", "AS2"],
    packId: "kroger",
    searchTerms: ["kroger"],
  },
  {
    id: "albertsons",
    name: "Albertsons",
    category: "grocery",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN"],
    packId: "albertsons",
    searchTerms: ["albertsons", "safeway"],
  },
  {
    id: "publix",
    name: "Publix",
    category: "grocery",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["VAN"],
    searchTerms: ["publix"],
  },
  {
    id: "meijer",
    name: "Meijer",
    category: "grocery",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN"],
    searchTerms: ["meijer"],
  },
  {
    id: "unfi",
    name: "UNFI",
    category: "distribution",
    typicalTransactions: ["850", "855", "856", "810", "846", "997"],
    typicalConnections: ["AS2", "VAN"],
    packId: "unfi",
    searchTerms: ["unfi", "united natural foods"],
  },
  {
    id: "kehe",
    name: "KeHE Distributors",
    category: "distribution",
    typicalTransactions: ["850", "856", "810", "846", "997"],
    typicalConnections: ["VAN", "AS2"],
    searchTerms: ["kehe"],
  },
  {
    id: "cvs",
    name: "CVS Health",
    category: "pharmacy",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["VAN", "AS2"],
    packId: "cvs",
    searchTerms: ["cvs"],
  },
  {
    id: "walgreens",
    name: "Walgreens",
    category: "pharmacy",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN"],
    packId: "walgreens",
    searchTerms: ["walgreens"],
  },
  {
    id: "dollargeneral",
    name: "Dollar General",
    category: "big_box",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN"],
    packId: "dollargeneral",
    searchTerms: ["dollar general", "dg"],
  },
  {
    id: "dollartree",
    name: "Dollar Tree / Family Dollar",
    category: "big_box",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN"],
    searchTerms: ["dollar tree", "family dollar"],
  },
  {
    id: "bestbuy",
    name: "Best Buy",
    category: "specialty",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["AS2", "VAN"],
    packId: "bestbuy",
    searchTerms: ["best buy", "bestbuy"],
  },
  {
    id: "nordstrom",
    name: "Nordstrom",
    category: "specialty",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN", "AS2"],
    searchTerms: ["nordstrom"],
  },
  {
    id: "macys",
    name: "Macy's",
    category: "specialty",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN"],
    searchTerms: ["macys", "macy's"],
  },
  {
    id: "dicks",
    name: "Dick's Sporting Goods",
    category: "specialty",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["VAN", "AS2"],
    packId: "dicks",
    searchTerms: ["dicks", "dick's sporting goods"],
  },
  {
    id: "samsclub",
    name: "Sam's Club",
    category: "big_box",
    portal: "Retail Link (Walmart ecosystem)",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["AS2", "VAN"],
    searchTerms: ["sams club", "sam's club"],
  },
  {
    id: "wholefoods",
    name: "Whole Foods Market (Amazon)",
    category: "grocery",
    typicalTransactions: ["850", "856", "810", "846", "997"],
    typicalConnections: ["AS2", "VAN"],
    searchTerms: ["whole foods", "wfm"],
  },
  {
    id: "wayfair",
    name: "Wayfair",
    category: "ecommerce",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["AS2", "API"],
    searchTerms: ["wayfair"],
  },
  {
    id: "chewy",
    name: "Chewy",
    category: "ecommerce",
    typicalTransactions: ["850", "856", "810", "997"],
    typicalConnections: ["VAN", "AS2"],
    searchTerms: ["chewy"],
  },
  {
    id: "generic",
    name: "Other / Custom Partner",
    category: "general",
    typicalTransactions: ["850", "855", "856", "810", "997"],
    typicalConnections: ["VAN", "AS2", "SFTP", "FTP"],
    searchTerms: ["other", "custom", "generic"],
  },
];

export function findTradingPartner(query: string): TradingPartnerCatalogEntry | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return INDUSTRY_TRADING_PARTNERS.find(
    (p) =>
      p.name.toLowerCase() === q ||
      p.id === q ||
      p.searchTerms.some((t) => t === q || q.includes(t) || t.includes(q))
  );
}
