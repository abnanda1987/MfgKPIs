/**
 * Master Data Repository
 * 
 * Provides CRUD operations for all master data entities.
 * Uses public CSV export for reads, Apps Script Web App for writes.
 * 
 * Each entity maps to one worksheet in the Master Data workbook.
 */

import { sheetsRepository } from "./google-sheets";
import {
  SheetRow,
  ApiResponse,
  SheetSchema,
} from "@/lib/types";

// ============================================================
// Sheet Schemas (derived from Master Data Design Document V3)
// ============================================================

export const MASTER_SHEET_SCHEMAS: Record<string, SheetSchema> = {
  Enterprise: {
    sheetName: "Enterprise",
    columns: [
      { name: "Enterprise ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Enterprise Name", type: "text", required: true },
      { name: "HQ Country", type: "text", required: true },
      { name: "Description", type: "text" },
    ],
    primaryKey: "Enterprise ID",
  },
  Country: {
    sheetName: "Country",
    columns: [
      { name: "Country Code", type: "text", required: true, isPrimaryKey: true },
      { name: "Country Name", type: "text", required: true },
    ],
    primaryKey: "Country Code",
  },
  City: {
    sheetName: "City",
    columns: [
      { name: "City ID", type: "text", required: true, isPrimaryKey: true },
      { name: "City Name", type: "text", required: true },
      { name: "Country", type: "select", required: true, isForeignKey: true, lookupSheet: "Country", lookupColumn: "Country Code" },
    ],
    primaryKey: "City ID",
  },
  Plant: {
    sheetName: "Plant",
    columns: [
      { name: "Plant ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Plant Name", type: "text", required: true },
      { name: "Plant Location", type: "select", required: true, isForeignKey: true, lookupSheet: "City", lookupColumn: "City ID" },
      { name: "Associated Enterprise ID", type: "select", required: true, isForeignKey: true, lookupSheet: "Enterprise", lookupColumn: "Enterprise ID" },
      { name: "Description", type: "text" },
    ],
    primaryKey: "Plant ID",
  },
  Department: {
    sheetName: "Department",
    columns: [
      { name: "Department ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Department Name", type: "text", required: true },
      { name: "Associated Plant ID", type: "select", required: true, isForeignKey: true, lookupSheet: "Plant", lookupColumn: "Plant ID" },
      { name: "Description", type: "text" },
    ],
    primaryKey: "Department ID",
    hasPlantFilter: true,
    plantColumn: "Associated Plant ID",
  },
  ProductionLine: {
    sheetName: "ProductionLine",
    columns: [
      { name: "Line ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Line Name", type: "text", required: true },
      { name: "Associated Department", type: "select", required: true, isForeignKey: true, lookupSheet: "Department", lookupColumn: "Department ID" },
      { name: "Description", type: "text" },
    ],
    primaryKey: "Line ID",
  },
  Machine: {
    sheetName: "Machine",
    columns: [
      { name: "Machine ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Machine Name", type: "text", required: true },
      { name: "Manufacturing date", type: "date" },
      { name: "Installation date", type: "date" },
      { name: "Last Service", type: "date" },
      { name: "Next Service", type: "date" },
      { name: "Associated Line", type: "select", required: true, isForeignKey: true, lookupSheet: "ProductionLine", lookupColumn: "Line ID" },
      { name: "Description", type: "text" },
      { name: "Machine Type", type: "text" },
      { name: "Station Sequence", type: "number" },
      { name: "Cycle Time (Sec)", type: "number" },
      { name: "Energy Consumption (kWh)", type: "number" },
      { name: "Availability Target (%)", type: "number" },
      { name: "Downtime Target (Min)", type: "number" },
    ],
    primaryKey: "Machine ID",
  },
  Product_SKU: {
    sheetName: "Product_SKU",
    columns: [
      { name: "Product Name", type: "text", required: true },
      { name: "Product Description", type: "text" },
      { name: "Variant", type: "text" },
      { name: "Product ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Associated Department ID", type: "select", required: true, isForeignKey: true, lookupSheet: "Department", lookupColumn: "Department ID" },
      { name: "Status", type: "select", required: true, lookupSheet: "Status", lookupColumn: "Status" },
    ],
    primaryKey: "Product ID",
    hasPlantFilter: true,
    plantColumn: "Associated Department ID",
  },
  User: {
    sheetName: "User",
    columns: [
      { name: "First Name", type: "text", required: true },
      { name: "Last Name", type: "text", required: true },
      { name: "Email", type: "email", required: true },
      { name: "Phone Number", type: "text" },
      { name: "User Role", type: "select", required: true, isForeignKey: true, lookupSheet: "Role", lookupColumn: "Role" },
      { name: "Associated Plant ID", type: "select", required: true, isForeignKey: true, lookupSheet: "Plant", lookupColumn: "Plant ID" },
      { name: "Password", type: "password", required: true },
    ],
    primaryKey: "Email",
    hasPlantFilter: true,
    plantColumn: "Associated Plant ID",
  },
  Problem: {
    sheetName: "Problem",
    columns: [
      { name: "Problem", type: "text", required: true, isPrimaryKey: true },
      { name: "Associated Machine", type: "select", isForeignKey: true, lookupSheet: "Machine", lookupColumn: "Machine ID" },
      { name: "Associated Line", type: "select", isForeignKey: true, lookupSheet: "ProductionLine", lookupColumn: "Line ID" },
      { name: "Associated Department", type: "select", isForeignKey: true, lookupSheet: "Department", lookupColumn: "Department ID" },
      { name: "Description", type: "text" },
    ],
    primaryKey: "Problem",
  },
  Role: {
    sheetName: "Role",
    columns: [
      { name: "Role", type: "text", required: true, isPrimaryKey: true },
      { name: "Description", type: "text" },
    ],
    primaryKey: "Role",
  },
  Shift: {
    sheetName: "Shift",
    columns: [
      { name: "Shift ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Shift Name", type: "text", required: true },
      { name: "Start", type: "text", required: true },
      { name: "End", type: "text", required: true },
    ],
    primaryKey: "Shift ID",
  },
  KPI: {
    sheetName: "KPI",
    columns: [
      { name: "Plant ID", type: "select", required: true, isForeignKey: true, lookupSheet: "Plant", lookupColumn: "Plant ID" },
      { name: "KPI", type: "text", required: true },
      { name: "Unit", type: "text", required: true },
      { name: "Target", type: "number", required: true },
    ],
    primaryKey: "KPI",
    hasPlantFilter: true,
    plantColumn: "Plant ID",
  },
  AlertThreshold: {
    sheetName: "AlertThreshold",
    columns: [
      { name: "Plant ID", type: "select", required: true, isForeignKey: true, lookupSheet: "Plant", lookupColumn: "Plant ID" },
      { name: "KPI", type: "text", required: true },
      { name: "Warning", type: "number", required: true },
      { name: "Critical", type: "number", required: true },
    ],
    primaryKey: "KPI",
    hasPlantFilter: true,
    plantColumn: "Plant ID",
  },
  ProblemCategory: {
    sheetName: "ProblemCategory",
    columns: [
      { name: "Category", type: "text", required: true, isPrimaryKey: true },
      { name: "Description", type: "text" },
    ],
    primaryKey: "Category",
  },
  Severity: {
    sheetName: "Severity",
    columns: [
      { name: "Severity", type: "text", required: true, isPrimaryKey: true },
      { name: "Priority", type: "number", required: true },
    ],
    primaryKey: "Severity",
  },
  Status: {
    sheetName: "Status",
    columns: [
      { name: "Status", type: "text", required: true, isPrimaryKey: true },
    ],
    primaryKey: "Status",
  },
  Calendar: {
    sheetName: "Calendar",
    columns: [
      { name: "Calendar ID", type: "text", required: true, isPrimaryKey: true },
      { name: "Date", type: "date", required: true },
      { name: "Week", type: "number", required: true },
      { name: "Month", type: "number", required: true },
      { name: "Quarter", type: "number", required: true },
      { name: "Year", type: "number", required: true },
      { name: "Day", type: "text", required: true },
      { name: "Weekend", type: "text", required: true },
    ],
    primaryKey: "Calendar ID",
  },
};

// ============================================================
// Master Data Service
// ============================================================

export class MasterDataRepository {
  /**
   * Get all records from a master sheet
   */
  static async getAll(sheetName: string): Promise<ApiResponse<SheetRow[]>> {
    return sheetsRepository.readSheet(sheetName);
  }

  /**
   * Get records filtered by plant (if applicable)
   */
  static async getByPlant(
    sheetName: string,
    plantId: string
  ): Promise<ApiResponse<SheetRow[]>> {
    const schema = MASTER_SHEET_SCHEMAS[sheetName];
    if (!schema?.hasPlantFilter || !schema.plantColumn) {
      return this.getAll(sheetName);
    }

    const allResult = await this.getAll(sheetName);
    if (!allResult.success || !allResult.data) {
      return allResult;
    }

    const filtered = allResult.data.filter(
      (row) => row[schema.plantColumn!] === plantId
    );

    return { success: true, data: filtered };
  }

  /**
   * Get a single record by primary key
   */
  static async getById(
    sheetName: string,
    id: string
  ): Promise<ApiResponse<SheetRow | null>> {
    const schema = MASTER_SHEET_SCHEMAS[sheetName];
    if (!schema) {
      return { success: false, error: `Unknown sheet: ${sheetName}` };
    }

    const allResult = await this.getAll(sheetName);
    if (!allResult.success || !allResult.data) {
      return { success: false, error: allResult.error || "Failed to fetch data" };
    }

    const record = allResult.data.find(
      (row) => row[schema.primaryKey] === id
    );

    return { success: true, data: record || null };
  }

  /**
   * Create a new record (append via Apps Script)
   */
  static async create(
    sheetName: string,
    data: SheetRow
  ): Promise<ApiResponse<void>> {
    const schema = MASTER_SHEET_SCHEMAS[sheetName];
    if (!schema) {
      return { success: false, error: `Unknown sheet: ${sheetName}` };
    }

    // Build values array in column order
    const values = schema.columns.map((col) => {
      const val = data[col.name];
      return val !== undefined && val !== null ? String(val) : "";
    });

    return sheetsRepository.appendRow(sheetName, values);
  }

  /**
   * Update an existing record
   * NOTE: In public sheets mode, update is not supported directly.
   * We append the updated row and note that the old one remains.
   */
  static async update(
    sheetName: string,
    id: string,
    data: SheetRow
  ): Promise<ApiResponse<void>> {
    const schema = MASTER_SHEET_SCHEMAS[sheetName];
    if (!schema) {
      return { success: false, error: `Unknown sheet: ${sheetName}` };
    }

    // In public sheets mode, we can't update in-place.
    // We append the new row. The UI will show both old and new.
    // For a demo, this is acceptable. In production, use the API.
    const values = schema.columns.map((col) => {
      const val = data[col.name];
      return val !== undefined && val !== null ? String(val) : "";
    });

    return sheetsRepository.appendRow(sheetName, values);
  }

  /**
   * Delete a record
   * NOTE: Not supported in public sheets mode
   */
  static async delete(
    sheetName: string,
    _id: string
  ): Promise<ApiResponse<void>> {
    console.warn(`Delete requested for ${sheetName} - not supported in public sheets mode`);
    return {
      success: false,
      error: "Delete not supported in public sheets mode. The sheet must be edited directly in Google Sheets.",
    };
  }

  /**
   * Get lookup values for a foreign key column
   */
  static async getLookupValues(
    lookupSheet: string,
    lookupColumn: string
  ): Promise<ApiResponse<string[]>> {
    const result = await this.getAll(lookupSheet);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Failed to fetch lookup data" };
    }

    const values = result.data
      .map((row) => String(row[lookupColumn] ?? ""))
      .filter(Boolean);

    return { success: true, data: values };
  }

  /**
   * Get all available master sheet names
   */
  static getSheetNames(): string[] {
    return Object.keys(MASTER_SHEET_SCHEMAS);
  }

  /**
   * Get schema for a sheet
   */
  static getSchema(sheetName: string): SheetSchema | undefined {
    return MASTER_SHEET_SCHEMAS[sheetName];
  }
}
