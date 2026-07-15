/**
 * Google Sheets Repository - Public Sheets (No API Key)
 * 
 * Reads via public gviz/tq CSV export (by sheet name).
 * Writes via Google Apps Script Web App.
 * 
 * MASTER CRUD -> GOOGLE_APPS_SCRIPT_MASTER_URL (master workbook)
 * SIMULATOR   -> GOOGLE_APPS_SCRIPT_TRANSACTION_URL (transaction workbook)
 */

import { SheetRow, ApiResponse } from "@/lib/types";

const MASTER_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MASTER_ID || "";
const APPS_SCRIPT_MASTER_URL = process.env.GOOGLE_APPS_SCRIPT_MASTER_URL || "";
const APPS_SCRIPT_TRANSACTION_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSACTION_URL || "";

// ============================================================
// CSV Parsing Helper
// ============================================================

function parseCSV(csvText: string): SheetRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const records: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: SheetRow = {};
    headers.forEach((header, index) => {
      let val = values[index] ?? "";
      val = val.trim();
      if (val.startsWith('"') && val.endsWith('"') && val.length > 1) {
        val = val.slice(1, -1);
      }
      record[header] = val;
    });
    records.push(record);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// ============================================================
// Public gviz/tq CSV Export (reads by sheet name)
// ============================================================

function getGvizUrl(spreadsheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function getExportUrl(spreadsheetId: string, gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

const SHEET_GID_MAP: Record<string, number> = {
  Enterprise: 0, Country: 1, City: 2, Plant: 3, Department: 4,
  ProductionLine: 5, Machine: 6, Product_SKU: 7, User: 8, Problem: 9,
  Role: 10, Shift: 11, KPI: 12, AlertThreshold: 13, ProblemCategory: 14,
  Severity: 15, Status: 16, Calendar: 17,
};

// ============================================================
// Core Sheet Operations
// ============================================================

export class GoogleSheetsRepository {
  /**
   * Read all data from a public sheet via gviz/tq API
   */
  async readSheet(sheetName: string): Promise<ApiResponse<SheetRow[]>> {
    try {
      if (!MASTER_SPREADSHEET_ID) {
        return { success: false, error: "Master spreadsheet ID not configured" };
      }

      const gvizUrl = getGvizUrl(MASTER_SPREADSHEET_ID, sheetName);
      console.log(`[Sheets] Trying gviz URL: ${gvizUrl}`);

      let response = await fetch(gvizUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const gid = SHEET_GID_MAP[sheetName];
        if (gid !== undefined) {
          const exportUrl = getExportUrl(MASTER_SPREADSHEET_ID, gid);
          console.log(`[Sheets] gviz failed, trying export URL: ${exportUrl}`);
          response = await fetch(exportUrl, {
            method: "GET",
            cache: "no-store",
          });
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[Sheets] HTTP ${response.status}: ${errorText}`);
        return {
          success: false,
          error: `Failed to fetch sheet '${sheetName}': HTTP ${response.status}`,
        };
      }

      const csvText = await response.text();
      console.log(`[Sheets] Raw CSV length: ${csvText.length} chars`);

      if (!csvText || csvText.trim().length === 0) {
        return { success: true, data: [] };
      }

      const records = parseCSV(csvText);
      console.log(`[Sheets] Parsed ${records.length} records from '${sheetName}'`);

      return { success: true, data: records };
    } catch (error) {
      console.error(`[Sheets] Error reading sheet ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to read sheet '${sheetName}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Write operation to MASTER workbook (CRUD)
   */
  private async writeToMaster(data: unknown): Promise<ApiResponse<unknown>> {
    if (!APPS_SCRIPT_MASTER_URL) {
      return { success: false, error: "Master Apps Script URL not configured" };
    }

    const response = await fetch(APPS_SCRIPT_MASTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  /**
   * Write operation to TRANSACTION workbook (simulator)
   */
  private async writeToTransaction(data: unknown): Promise<ApiResponse<unknown>> {
    if (!APPS_SCRIPT_TRANSACTION_URL) {
      return { success: false, error: "Transaction Apps Script URL not configured" };
    }

    const response = await fetch(APPS_SCRIPT_TRANSACTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  /**
   * BATCH APPEND to MASTER workbook
   */
  async batchAppend(
    sheetName: string,
    headers: string[],
    rows: (string | number)[][]
  ): Promise<ApiResponse<{ count: number }>> {
    try {
      const result = await this.writeToMaster({
        sheetName,
        headers,
        rows,
        batch: true,
      });

      if (!result.success) {
        return { success: false, error: String(result.error || "Batch append failed") };
      }

      return { success: true, data: { count: rows.length }, message: String(result.message || "") };
    } catch (error) {
      console.error(`[Sheets] Error batch appending to ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to batch append to sheet: ${sheetName}`,
      };
    }
  }

  /**
   * BATCH APPEND to TRANSACTION workbook (simulator)
   */
  async batchAppendTransaction(
    sheetName: string,
    headers: string[],
    rows: (string | number)[][]
  ): Promise<ApiResponse<{ count: number }>> {
    try {
      const result = await this.writeToTransaction({
        sheetName,
        headers,
        rows,
        batch: true,
      });

      if (!result.success) {
        return { success: false, error: String(result.error || "Batch append failed") };
      }

      return { success: true, data: { count: rows.length }, message: String(result.message || "") };
    } catch (error) {
      console.error(`[Sheets] Error batch appending to transaction ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to batch append to transaction sheet: ${sheetName}`,
      };
    }
  }

  /**
   * UPDATE ROW in MASTER workbook
   */
  async updateRow(
    sheetName: string,
    primaryKey: string,
    primaryKeyValue: string,
    values: (string | number)[]
  ): Promise<ApiResponse<void>> {
    try {
      const result = await this.writeToMaster({
        sheetName,
        action: "update",
        primaryKey,
        primaryKeyValue,
        values,
      });

      if (!result.success) {
        return { success: false, error: String(result.error || "Update failed") };
      }

      return { success: true, message: "Row updated successfully" };
    } catch (error) {
      console.error(`[Sheets] Error updating row in ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to update row in sheet: ${sheetName}`,
      };
    }
  }

  /**
   * DELETE ROW from MASTER workbook
   */
  async deleteRow(
    sheetName: string,
    primaryKey: string,
    primaryKeyValue: string
  ): Promise<ApiResponse<void>> {
    try {
      const result = await this.writeToMaster({
        sheetName,
        action: "delete",
        primaryKey,
        primaryKeyValue,
      });

      if (!result.success) {
        return { success: false, error: String(result.error || "Delete failed") };
      }

      return { success: true, message: "Row deleted successfully" };
    } catch (error) {
      console.error(`[Sheets] Error deleting row from ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to delete row from sheet: ${sheetName}`,
      };
    }
  }

  /**
   * SINGLE APPEND to MASTER workbook
   */
  async appendRow(
    sheetName: string,
    values: (string | number)[]
  ): Promise<ApiResponse<void>> {
    return this.batchAppend(sheetName, [], [values]).then(r => ({
      success: r.success,
      error: r.error,
      message: r.message,
    }));
  }

  /**
   * SINGLE APPEND with headers to MASTER workbook
   */
  async appendRowWithHeaders(
    sheetName: string,
    headers: string[],
    values: (string | number)[]
  ): Promise<ApiResponse<void>> {
    return this.batchAppend(sheetName, headers, [values]).then(r => ({
      success: r.success,
      error: r.error,
      message: r.message,
    }));
  }
}

// Singleton instance
export const sheetsRepository = new GoogleSheetsRepository();
