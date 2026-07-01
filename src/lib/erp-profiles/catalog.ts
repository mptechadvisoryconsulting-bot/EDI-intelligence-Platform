import type { ErpProfile } from "./types";

/** Shared aliases used when no ERP-specific name is known */
export const GENERIC_ERP_ALIASES: Record<string, string[]> = {
  "BEG.03": ["ponumber", "purchord", "custpo", "documentnumber", "orderno"],
  "BEG.05": ["podate", "docdate", "transactiondate", "createddate"],
  "PO1.02": ["orderqty", "qtyordered", "lineqty", "quantityordered"],
  "PO1.03": ["uom", "unit", "measurecode", "qtyuom"],
  "PO1.04": ["unitprice", "priceeach", "netprice", "unitcost"],
  "PO1.07": ["buyerpart", "customerpart", "custitem", "buyeritemno"],
  "PO1.09": ["vendorpart", "supplierpart", "itemno", "sku", "partnumber"],
  "REF.02": ["vendorref", "vendorno", "supplierref", "referenceno"],
  "N1.02": ["shiptoname", "shipto", "deliverto", "consigneename"],
  "BIG.02": ["invoiceno", "invnumber", "billno", "documentno"],
  "BIG.07": ["invdate", "invoicedate", "billingdate"],
  "IT1.02": ["invqty", "billedqty", "quantityinvoiced"],
  "IT1.04": ["lineamount", "extendedprice", "linetotal"],
  "BSN.02": ["shipmentid", "asnnumber", "bolnumber", "pronumber"],
  "HL.03": ["packlevel", "hierarchylevel", "shippack"],
  "LIN.02": ["linestatus", "itemstatus", "availabilitystatus"],
  "QTY.02": ["onhandqty", "availableqty", "inventoryqty", "qtyonhand"],
};

const SAP_ALIASES: Record<string, string[]> = {
  "BEG.03": ["EBELN", "BSTNR", "PurchaseOrder", "PO_NUMBER"],
  "BEG.05": ["BEDAT", "EINDT", "OrderDate", "PO_DATE"],
  "PO1.02": ["MENGE", "KWMENG", "OrderQuantity", "TargetQty"],
  "PO1.03": ["MEINS", "UnitOfMeasure", "UOM"],
  "PO1.04": ["NETPR", "UnitPrice", "KBETR"],
  "PO1.07": ["MATNR", "CustomerMaterial", "KDMAT"],
  "PO1.09": ["MATNR", "VendorMaterial", "SupplierPart"],
  "REF.02": ["LIFNR", "VendorAccount", "SupplierNumber"],
  "N1.02": ["NAME1", "ShipToName", "KUNNR_NAME"],
  "BIG.02": ["VBELN", "InvoiceNumber", "BELNR"],
  "BIG.07": ["FKDAT", "BillingDate", "InvoiceDate"],
  "IT1.02": ["FKIMG", "BillingQty", "InvoiceQty"],
  "IT1.04": ["NETWR", "LineAmount", "ExtendedAmount"],
  "BSN.02": ["VBELN", "DeliveryNumber", "ShipmentID"],
  "LIN.02": ["LABST", "StockStatus", "AvailabilityCode"],
  "QTY.02": ["LABST", "AvailableStock", "ATP_QTY"],
};

const ORACLE_CLOUD_ALIASES: Record<string, string[]> = {
  "BEG.03": ["OrderNumber", "PO_NUMBER", "CustomerPONumber", "CustPO"],
  "BEG.05": ["OrderedDate", "PO_DATE", "CreationDate"],
  "PO1.02": ["OrderedQuantity", "Quantity", "Qty"],
  "PO1.03": ["UOMCode", "UnitOfMeasure", "PrimaryUOM"],
  "PO1.04": ["UnitPrice", "ListPrice", "Price"],
  "PO1.07": ["CustomerItemNumber", "BuyerItem", "CustomerPartNumber"],
  "PO1.09": ["ItemNumber", "SupplierItem", "InventoryItemId"],
  "REF.02": ["SupplierNumber", "VendorId", "SupplierSiteId"],
  "N1.02": ["ShipToPartyName", "ShipToLocation", "DeliverToName"],
  "BIG.02": ["TransactionNumber", "InvoiceNumber", "TrxNumber"],
  "BIG.07": ["InvoiceDate", "TrxDate", "BillingDate"],
  "IT1.02": ["QuantityInvoiced", "InvoicedQty"],
  "IT1.04": ["ExtendedAmount", "LineAmount", "Amount"],
  "BSN.02": ["ShipmentNumber", "DeliveryId", "ShipConfirmNumber"],
  "QTY.02": ["OnHandQuantity", "AvailableToTransact", "ATPQuantity"],
};

const NETSUITE_ALIASES: Record<string, string[]> = {
  "BEG.03": ["tranid", "otherrefnum", "purchaseordernumber", "custbody_po_number"],
  "BEG.05": ["trandate", "podate", "datecreated"],
  "PO1.02": ["quantity", "quantitycommitted", "quantityordered"],
  "PO1.03": ["units", "unitstype", "saleunit"],
  "PO1.04": ["rate", "price", "amount"],
  "PO1.07": ["custcol_buyer_part", "customerpartnumber"],
  "PO1.09": ["item", "itemid", "vendorname"],
  "REF.02": ["entity", "vendor", "otherrefnum"],
  "N1.02": ["shipaddress", "shipaddressee", "shippingaddress"],
  "BIG.02": ["tranid", "invoicenum", "billnumber"],
  "BIG.07": ["trandate", "invoicedate"],
  "IT1.02": ["quantity", "quantitybilled"],
  "IT1.04": ["amount", "grossamt", "linetotal"],
  "BSN.02": ["tranid", "fulfillmentnumber", "shipgroup"],
  "QTY.02": ["quantityavailable", "locationquantityavailable"],
};

const D365_ALIASES: Record<string, string[]> = {
  "BEG.03": ["PurchId", "CustomerRef", "CustomerRequisition", "PurchaseOrderNumber"],
  "BEG.05": ["OrderDate", "CreatedDateTime", "AccountingDate"],
  "PO1.02": ["PurchQty", "RemainPurchPhysical", "OrderedQuantity"],
  "PO1.03": ["PurchUnit", "UnitOfMeasure", "ProductUnitOfMeasure"],
  "PO1.04": ["PurchPrice", "LineAmount", "UnitPrice"],
  "PO1.07": ["ExternalItemId", "CustomerProductNumber", "BuyerPartNumber"],
  "PO1.09": ["ItemId", "ProductNumber", "VendorProductNumber"],
  "REF.02": ["VendorAccount", "OrderAccount", "SupplierReference"],
  "N1.02": ["DeliveryName", "ShipToName", "LogisticsPostalAddress"],
  "BIG.02": ["InvoiceId", "InvoiceAccount", "InvoiceNumber"],
  "BIG.07": ["InvoiceDate", "DocumentDate"],
  "IT1.02": ["Qty", "InvoiceQty", "InventQty"],
  "IT1.04": ["LineAmount", "SalesPrice", "AmountCur"],
  "BSN.02": ["ShipmentId", "LoadId", "PackingSlipId"],
  "QTY.02": ["AvailPhysical", "OnHand", "AvailableQuantity"],
};

export const ERP_PROFILES: ErpProfile[] = [
  {
    id: "sap_s4",
    name: "SAP S/4HANA",
    vendor: "SAP",
    category: "enterprise",
    fieldAliases: SAP_ALIASES,
    searchTerms: ["sap", "s4", "s/4", "s4hana", "hana"],
    schemaNotes: "IDoc and CDS/API field names vary by message type (ORDERS, INVOIC, DESADV).",
  },
  {
    id: "sap_ecc",
    name: "SAP ECC / R/3",
    vendor: "SAP",
    category: "legacy",
    fieldAliases: SAP_ALIASES,
    searchTerms: ["ecc", "r/3", "r3", "sap ecc"],
  },
  {
    id: "oracle_cloud",
    name: "Oracle Fusion Cloud ERP",
    vendor: "Oracle",
    category: "cloud",
    fieldAliases: ORACLE_CLOUD_ALIASES,
    searchTerms: ["oracle cloud", "fusion", "oracle erp cloud", "ofscm"],
  },
  {
    id: "oracle_ebs",
    name: "Oracle E-Business Suite",
    vendor: "Oracle",
    category: "enterprise",
    fieldAliases: {
      ...ORACLE_CLOUD_ALIASES,
      "BEG.03": ["PO_HEADER_ID", "SEGMENT1", "OrderNumber", "CustomerPO"],
      "PO1.02": ["QUANTITY", "ORDERED_QUANTITY", "QTY"],
    },
    searchTerms: ["ebs", "e-business", "oracle apps", "oracle e-business suite"],
  },
  {
    id: "oracle_netsuite",
    name: "Oracle NetSuite",
    vendor: "Oracle",
    category: "cloud",
    fieldAliases: NETSUITE_ALIASES,
    searchTerms: ["netsuite", "net suite", "ns erp"],
  },
  {
    id: "d365_fo",
    name: "Microsoft Dynamics 365 Finance & Operations",
    vendor: "Microsoft",
    category: "enterprise",
    fieldAliases: D365_ALIASES,
    searchTerms: ["d365", "dynamics 365", "finance and operations", "f&o", "fo", "ax"],
  },
  {
    id: "d365_bc",
    name: "Microsoft Dynamics 365 Business Central",
    vendor: "Microsoft",
    category: "midmarket",
    fieldAliases: {
      ...D365_ALIASES,
      "BEG.03": ["DocumentNo", "ExternalDocumentNo", "YourReference"],
      "PO1.02": ["Quantity", "OutstandingQuantity"],
    },
    searchTerms: ["business central", "bc", "nav", "dynamics nav"],
  },
  {
    id: "dynamics_gp",
    name: "Microsoft Dynamics GP",
    vendor: "Microsoft",
    category: "midmarket",
    fieldAliases: {
      ...D365_ALIASES,
      "BEG.03": ["PONUMBER", "CUSTNAME", "CustomerPO"],
      "PO1.02": ["QTYORDER", "QTYCMT"],
    },
    searchTerms: ["dynamics gp", "great plains", "gp"],
  },
  {
    id: "infor_m3",
    name: "Infor M3",
    vendor: "Infor",
    category: "enterprise",
    fieldAliases: {
      "BEG.03": ["ORNO", "PUNO", "CustomerOrderNumber"],
      "BEG.05": ["ORDT", "PurchaseOrderDate"],
      "PO1.02": ["ORQT", "LineQuantity"],
      "PO1.03": ["UNIT", "SalesUOM"],
      "PO1.04": ["SAPR", "SalesPrice"],
      "PO1.09": ["ITNO", "ItemNumber"],
      "BIG.02": ["IVNO", "InvoiceNumber"],
      "BSN.02": ["DLIX", "DeliveryNumber"],
      "QTY.02": ["STQT", "OnHandBalance"],
    },
    searchTerms: ["infor m3", "m3", "movex"],
  },
  {
    id: "infor_cloudsuite",
    name: "Infor CloudSuite Industrial (SyteLine)",
    vendor: "Infor",
    category: "cloud",
    fieldAliases: {
      "BEG.03": ["co_num", "CustPo", "OrderNumber"],
      "PO1.02": ["qty_ordered", "QtyOrderedConv"],
      "PO1.03": ["u_m", "UM"],
      "PO1.04": ["price", "UnitPriceConv"],
      "PO1.09": ["item", "Item"],
      "BIG.02": ["inv_num", "InvoiceNumber"],
      "BSN.02": ["shipment_id", "ShipCode"],
    },
    searchTerms: ["cloudsuite", "syteline", "infor cs"],
  },
  {
    id: "epicor_kinetic",
    name: "Epicor Kinetic / ERP",
    vendor: "Epicor",
    category: "midmarket",
    fieldAliases: {
      "BEG.03": ["PONum", "OrderNum", "CustPONum"],
      "BEG.05": ["OrderDate", "PODate"],
      "PO1.02": ["OrderQty", "OurQty"],
      "PO1.03": ["IUM", "SalesUM"],
      "PO1.04": ["UnitPrice", "DocUnitPrice"],
      "PO1.09": ["PartNum", "XPartNum"],
      "BIG.02": ["InvoiceNum", "LegalNumber"],
      "BSN.02": ["PackNum", "ShipHeadNum"],
      "QTY.02": ["OnHandQty", "AvailableQty"],
    },
    searchTerms: ["epicor", "kinetic", "vantage"],
  },
  {
    id: "sage_x3",
    name: "Sage X3",
    vendor: "Sage",
    category: "midmarket",
    fieldAliases: {
      "BEG.03": ["SOHNUM", "BPCORD", "CustomerPO"],
      "PO1.02": ["QTY", "SAUQTY"],
      "PO1.03": ["SAU", "UOM"],
      "PO1.04": ["NETPRI", "GROPRI"],
      "BIG.02": ["SIHNUM", "InvoiceNumber"],
      "BSN.02": ["SDHNUM", "DeliveryNumber"],
    },
    searchTerms: ["sage x3", "x3"],
  },
  {
    id: "sage_intacct",
    name: "Sage Intacct",
    vendor: "Sage",
    category: "cloud",
    fieldAliases: {
      "BEG.03": ["PONUMBER", "DOCNO", "referenceno"],
      "PO1.02": ["QUANTITY", "QTY"],
      "PO1.03": ["UNIT", "UOM"],
      "PO1.04": ["PRICE", "TRX_PRICE"],
      "BIG.02": ["RECORDNO", "DOCNO", "InvoiceNumber"],
      "BIG.07": ["WHENCREATED", "InvoiceDate"],
    },
    searchTerms: ["intacct", "sage intacct"],
  },
  {
    id: "jde",
    name: "JD Edwards EnterpriseOne",
    vendor: "Oracle",
    category: "enterprise",
    fieldAliases: {
      "BEG.03": ["DOCO", "CustomerPO", "VR01"],
      "BEG.05": ["TRDJ", "OrderDate"],
      "PO1.02": ["UORG", "QuantityOrdered"],
      "PO1.03": ["UOM", "UM"],
      "PO1.04": ["UPRC", "UnitPrice"],
      "PO1.09": ["LITM", "ItemNumber"],
      "BIG.02": ["DOC", "InvoiceNumber"],
      "BSN.02": ["SHPN", "ShipmentNumber"],
    },
    searchTerms: ["jde", "jd edwards", "enterpriseone", "e1"],
  },
  {
    id: "ifs",
    name: "IFS Cloud / Applications",
    vendor: "IFS",
    category: "enterprise",
    fieldAliases: {
      "BEG.03": ["OrderNo", "CustomerPoNo"],
      "PO1.02": ["BuyQtyDue", "QtyOrdered"],
      "PO1.03": ["SalesUnitMeas", "UnitMeas"],
      "PO1.04": ["SaleUnitPrice", "UnitPriceInCurr"],
      "BIG.02": ["InvoiceNo", "SeriesId"],
      "BSN.02": ["ShipmentId", "DeliveryNoteNo"],
      "QTY.02": ["QtyOnhand", "AvailableQty"],
    },
    searchTerms: ["ifs", "ifs cloud", "ifs applications"],
  },
  {
    id: "qad",
    name: "QAD Adaptive ERP",
    vendor: "QAD",
    category: "midmarket",
    fieldAliases: {
      "BEG.03": ["po_nbr", "cust_po", "OrderNumber"],
      "PO1.02": ["ord_qty", "QtyOrdered"],
      "PO1.03": ["um", "UOM"],
      "PO1.04": ["list_pr", "UnitPrice"],
      "BIG.02": ["inv_nbr", "InvoiceNumber"],
      "BSN.02": ["ship_id", "ShipmentId"],
    },
    searchTerms: ["qad", "adaptive erp"],
  },
  {
    id: "plex",
    name: "Plex ERP",
    vendor: "Rockwell Automation",
    category: "cloud",
    fieldAliases: {
      "BEG.03": ["Customer_PO", "Order_No"],
      "PO1.02": ["Order_Quantity", "Qty"],
      "PO1.03": ["UOM", "Unit"],
      "PO1.04": ["Unit_Price", "Price"],
      "BIG.02": ["Invoice_No", "Bill_No"],
      "BSN.02": ["Shipment_No", "ASN_No"],
    },
    searchTerms: ["plex", "plex erp"],
  },
  {
    id: "acumatica",
    name: "Acumatica Cloud ERP",
    vendor: "Acumatica",
    category: "cloud",
    fieldAliases: {
      "BEG.03": ["CustomerOrderNbr", "OrderNbr", "CustomerRef"],
      "PO1.02": ["OrderQty", "Qty"],
      "PO1.03": ["UOM", "BaseUnit"],
      "PO1.04": ["UnitPrice", "CuryUnitPrice"],
      "BIG.02": ["RefNbr", "InvoiceNbr"],
      "BSN.02": ["ShipmentNbr", "ShipmentNumber"],
    },
    searchTerms: ["acumatica"],
  },
  {
    id: "workday",
    name: "Workday Financials / SCM",
    vendor: "Workday",
    category: "cloud",
    fieldAliases: {
      "BEG.03": ["Purchase_Order_ID", "Customer_PO", "Document_Number"],
      "PO1.02": ["Quantity", "Ordered_Quantity"],
      "PO1.03": ["Unit_of_Measure", "UOM"],
      "PO1.04": ["Unit_Cost", "Extended_Amount"],
      "BIG.02": ["Invoice_Number", "Supplier_Invoice_Reference"],
      "BSN.02": ["Shipment_Reference", "ASN_ID"],
    },
    searchTerms: ["workday"],
  },
  {
    id: "salesforce",
    name: "Salesforce (Order Management / B2B)",
    vendor: "Salesforce",
    category: "cloud",
    fieldAliases: {
      "BEG.03": ["PoNumber", "OrderNumber", "ExternalId"],
      "BEG.05": ["EffectiveDate", "OrderDate"],
      "PO1.02": ["Quantity", "OrderItemQuantity"],
      "PO1.03": ["UnitOfMeasure", "QuantityUnitOfMeasure"],
      "PO1.04": ["UnitPrice", "ListPrice"],
      "N1.02": ["ShipToName", "ShippingAddress"],
    },
    searchTerms: ["salesforce", "sfdc", "order management"],
  },
  {
    id: "custom",
    name: "Custom / Other ERP",
    vendor: "Any",
    category: "custom",
    fieldAliases: GENERIC_ERP_ALIASES,
    searchTerms: ["custom", "other", "legacy", "homegrown", "proprietary"],
    schemaNotes: "Upload your ERP field list CSV — matching uses column names plus generic EDI hints.",
  },
];

export function listErpProfiles(): ErpProfile[] {
  return ERP_PROFILES.filter((p) => p.id !== "custom");
}

export function getErpProfileById(id: string): ErpProfile | undefined {
  return ERP_PROFILES.find((p) => p.id === id);
}

export function resolveErpProfile(erpSystem: string): ErpProfile {
  const normalized = erpSystem.trim().toLowerCase();
  if (!normalized) return getErpProfileById("custom")!;

  const exact = ERP_PROFILES.find(
    (p) =>
      p.id === normalized ||
      p.name.toLowerCase() === normalized ||
      p.vendor.toLowerCase() === normalized
  );
  if (exact) return exact;

  const scored = ERP_PROFILES.map((profile) => {
    let score = 0;
    const nameLower = profile.name.toLowerCase();
    if (normalized.includes(nameLower) || nameLower.includes(normalized)) score += 10;
    for (const term of profile.searchTerms) {
      if (normalized.includes(term)) score += 5;
    }
    if (normalized.includes(profile.vendor.toLowerCase())) score += 2;
    return { profile, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.profile ?? getErpProfileById("custom")!;
}

export function enrichHintsMap(
  baseHints: Record<string, string[]>,
  erpSystem: string
): { hints: Record<string, string[]>; profile: ErpProfile; erpSpecific: boolean } {
  const profile = resolveErpProfile(erpSystem);
  const erpSpecific = profile.id !== "custom";
  const hints: Record<string, string[]> = {};

  for (const [key, values] of Object.entries(baseHints)) {
    const erpAliases = profile.fieldAliases[key] ?? [];
    const generic = GENERIC_ERP_ALIASES[key] ?? [];
    hints[key] = [...new Set([...values, ...erpAliases, ...(erpSpecific ? [] : generic)])];
  }

  for (const [key, erpAliases] of Object.entries(profile.fieldAliases)) {
    if (!hints[key]) {
      hints[key] = [...new Set([...erpAliases, ...(erpSpecific ? [] : GENERIC_ERP_ALIASES[key] ?? [])])];
    }
  }

  return { hints, profile, erpSpecific };
}

export function describeErpSupport(erpSystem: string): string {
  const profile = resolveErpProfile(erpSystem);
  if (profile.id === "custom") {
    return `Generic ERP mode for "${erpSystem}" — upload a source field list for best mapping accuracy. ${listErpProfiles().length}+ named ERP profiles available when creating a workspace.`;
  }
  return `Using ${profile.name} field aliases (${profile.vendor}) plus uploaded source data for mapping.`;
}
