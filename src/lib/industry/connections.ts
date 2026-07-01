/** EDI connectivity — protocols, VANs, and B2B platforms */

export type ConnectionProtocol = {
  id: string;
  name: string;
  description: string;
  commonUse: string;
};

export type ConnectionProvider = {
  id: string;
  name: string;
  type: "van" | "b2b_platform" | "translator" | "managed_service";
  protocols: string[];
  notes?: string;
};

export const CONNECTION_PROTOCOLS: ConnectionProtocol[] = [
  {
    id: "as2",
    name: "AS2",
    description: "HTTPS-based EDI with signing and encryption — common for Walmart, Target, Amazon direct.",
    commonUse: "Direct retailer connections",
  },
  {
    id: "sftp",
    name: "SFTP / SSH",
    description: "Secure file drop — often used with VAN mailbox or Sterling SFTP gateway.",
    commonUse: "VAN pickup, batch file exchange",
  },
  {
    id: "van",
    name: "Value Added Network (VAN)",
    description: "Third-party network routes EDI between you and trading partners.",
    commonUse: "Multi-partner retail onboarding",
  },
  {
    id: "ftp",
    name: "FTP / FTPS",
    description: "Legacy file transfer — still used by some partners and 3PLs.",
    commonUse: "Older partner integrations",
  },
  {
    id: "oftp2",
    name: "OFTP2",
    description: "Automotive/European supply chain protocol — push or VAN-mediated.",
    commonUse: "Automotive, EU partners",
  },
  {
    id: "api",
    name: "API / REST",
    description: "Modern hybrid — Amazon SP-API, some retailers replacing EDI for certain flows.",
    commonUse: "E-commerce marketplaces",
  },
  {
    id: "connect_direct",
    name: "Connect:Direct / C:D",
    description: "Point-to-point managed file transfer — enterprise and IBM ecosystem.",
    commonUse: "Enterprise B2B, IBM Sterling",
  },
];

export const CONNECTION_PROVIDERS: ConnectionProvider[] = [
  {
    id: "ibm_sterling_van",
    name: "IBM Sterling B2B Commerce / VAN",
    type: "van",
    protocols: ["as2", "sftp", "van", "oftp2", "connect_direct"],
    notes: "Sterling VAN — 3M+ partner network; SFTP or AS2 into Sterling.",
  },
  {
    id: "ibm_sterling_integrator",
    name: "IBM Sterling B2B Integrator",
    type: "b2b_platform",
    protocols: ["as2", "sftp", "ftp", "van", "oftp2"],
    notes: "On-prem or hybrid B2B gateway — maps and routes EDI.",
  },
  {
    id: "cleo",
    name: "Cleo Integration Cloud",
    type: "managed_service",
    protocols: ["as2", "sftp", "van", "ftp"],
    notes: "Managed EDI + VAN connectivity.",
  },
  {
    id: "sps_commerce",
    name: "SPS Commerce",
    type: "van",
    protocols: ["van", "as2", "sftp"],
    notes: "Retail-focused VAN — common for Costco and mid-market suppliers.",
  },
  {
    id: "truecommerce",
    name: "TrueCommerce",
    type: "van",
    protocols: ["van", "as2", "sftp", "ftp"],
  },
  {
    id: "opentext",
    name: "OpenText B2B Integration",
    type: "b2b_platform",
    protocols: ["as2", "sftp", "van", "oftp2"],
  },
  {
    id: "boomi",
    name: "Boomi B2B/EDI Management",
    type: "b2b_platform",
    protocols: ["as2", "sftp", "api"],
  },
  {
    id: "dicentral",
    name: "DiCentral",
    type: "van",
    protocols: ["van", "as2", "sftp"],
  },
  {
    id: "jagged_peak",
    name: "Jagged Peak (enVista)",
    type: "managed_service",
    protocols: ["van", "as2", "sftp"],
  },
  {
    id: "orderful",
    name: "Orderful",
    type: "managed_service",
    protocols: ["api", "as2", "van"],
    notes: "Modern EDI network with API-first onboarding.",
  },
  {
    id: "crstl",
    name: "Crstl",
    type: "managed_service",
    protocols: ["api", "van", "as2"],
  },
  {
    id: "direct_as2",
    name: "Direct AS2 (self-hosted)",
    type: "b2b_platform",
    protocols: ["as2"],
  },
  {
    id: "direct_sftp",
    name: "Direct SFTP (self-hosted / 3PL)",
    type: "b2b_platform",
    protocols: ["sftp"],
  },
  {
    id: "other",
    name: "Other / Custom",
    type: "b2b_platform",
    protocols: ["as2", "sftp", "van", "ftp", "api"],
  },
];

export const B2B_TRANSLATOR_PLATFORMS = [
  "IBM Sterling B2B Integrator",
  "IBM Sterling Map Editor (MRS)",
  "Cleo LexiCom / Cleo Integration Cloud",
  "OpenText BizManager / B2B",
  "Seeburger BIS",
  "Liaison Delta / Alpha",
  "Boomi EDI",
  "Microsoft BizTalk Server",
  "MuleSoft B2B",
  "Custom / In-house maps",
];

export function describeConnection(protocolId: string, providerId?: string) {
  const protocol = CONNECTION_PROTOCOLS.find((p) => p.id === protocolId);
  const provider = providerId
    ? CONNECTION_PROVIDERS.find((p) => p.id === providerId)
    : undefined;
  if (!protocol) return "Connection not specified";
  return provider ? `${provider.name} via ${protocol.name}` : protocol.name;
}
