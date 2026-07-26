export type InterfaceStyle = "positional" | "xml" | "soap" | "rest";

export type ErpLayoutField = {
  fieldName: string;
  interfaceColumn: string;
  interfaceStyle: InterfaceStyle;
  /** Logical transaction record group, such as Header, Detail, or Summary. */
  recordType?: string;
  recNumber?: number;
  /** Oracle start column / positional start */
  startPosition?: number;
  /** Oracle width / character limit */
  charLimit?: number;
  dataType?: string;
  table?: string;
  description?: string;
  validationRule?: string;
  repeating?: boolean;
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
