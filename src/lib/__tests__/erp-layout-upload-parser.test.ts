import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOracleTransactionLayoutReport,
  parseOracleTransactionLayoutReport,
} from "../erp-layout/upload-parser";

const ORACLE_LAYOUT_REPORT = `
Oracle E-Commerce Gateway
Transaction Layout Definition Report
Transaction: POI Description: IN: Purchase Order (850/ORDERS)
Level: Order Header Interface Table: OE_HEADERS_INTERFACE
-Record Layout-
Interface Column                              Ext Table   Rec Num Pos Width Data Type Start Col Seq Code Qual
-------------------------------------------- -------- ------ ----- ----- --------- --------- --- ---- ----
Transaction_Method                                          10    10     2 VARCHAR2       101     CT  CTL
OPERATION_CODE_EXT1                                       1000    40     5 VARCHAR2       113   1 PO  PO1
CUSTOMER_PO_NUMBER                                        1000    50    50 VARCHAR2       118     PO  PO1
ORDERED_DATE                                              1000    60    15 DATE           168     PO  PO1
`;

const GENERIC_LAYOUT_REPORT = `
Transaction Layout Definition Report
-Record Layout-
Interface Column Ext Table Rec Num Pos Width Data Type Start Col Seq Code Qual
CUSTOMER_PO_NUMBER 1000 50 50 VARCHAR2 118 PO PO1
`;

describe("Oracle Transaction Layout Definition Report parser", () => {
  it("recognizes Oracle report markers", () => {
    assert.equal(isOracleTransactionLayoutReport(ORACLE_LAYOUT_REPORT), true);
    assert.equal(isOracleTransactionLayoutReport("Interface Column,Field Name,Width"), false);
  });

  it("requires an Oracle-specific identifier", () => {
    assert.equal(isOracleTransactionLayoutReport(GENERIC_LAYOUT_REPORT), false);
    assert.deepEqual(parseOracleTransactionLayoutReport(GENERIC_LAYOUT_REPORT), []);
  });

  it("extracts positional fields from Oracle TXT/PDF text", () => {
    const fields = parseOracleTransactionLayoutReport(ORACLE_LAYOUT_REPORT);

    assert.equal(fields.length, 4);
    assert.deepEqual(
      fields.map((field) => ({
        name: field.interfaceColumn,
        rec: field.recNumber,
        start: field.startPosition,
        width: field.charLimit,
        type: field.dataType,
        recordType: field.recordType,
      })),
      [
        { name: "Transaction_Method", rec: 10, start: 101, width: 2, type: "VARCHAR2", recordType: "CT/CTL" },
        { name: "OPERATION_CODE_EXT1", rec: 1000, start: 113, width: 5, type: "VARCHAR2", recordType: "PO/PO1" },
        { name: "CUSTOMER_PO_NUMBER", rec: 1000, start: 118, width: 50, type: "VARCHAR2", recordType: "PO/PO1" },
        { name: "ORDERED_DATE", rec: 1000, start: 168, width: 15, type: "DATE", recordType: "PO/PO1" },
      ]
    );
  });

  it("does not reinterpret ordinary text as an ERP layout", () => {
    const fields = parseOracleTransactionLayoutReport("Customer PO Number 1000 50 50 VARCHAR2 118 PO PO1");
    assert.deepEqual(fields, []);
  });
});
