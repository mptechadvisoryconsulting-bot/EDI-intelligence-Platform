export type InterfaceStyle = "positional" | "xml" | "soap" | "rest";

export type ErpLayoutField = {
  fieldName: string;
  interfaceColumn: string;
  interfaceStyle: InterfaceStyle;
  recNumber?: number;
  /** Oracle start column / positional start */
  startPosition?: number;
  /** Oracle width / character limit */
  charLimit?: number;
  dataType?: string;
  table?: string;
  description?: string;
  xpath?: string;
  jsonPath?: string;
  soapPath?: string;
  soapOperation?: string;
  sortOrder?: number;
};

export type ErpLayoutProfile = {
  erpSystem: string;
  erpVersion?: string | null;
  originalFileName?: string | null;
  defaultInterfaceStyle?: InterfaceStyle;
  fields: ErpLayoutField[];
  fieldCount: number;
  updatedAt?: string;
};
