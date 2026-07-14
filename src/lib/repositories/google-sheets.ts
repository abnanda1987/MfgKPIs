/**
 * Google Sheets Repository - Public Sheets (No API Key)
 * 
 * Reads via public gviz/tq CSV export (by sheet name).
 * Writes via Google Apps Script Web App.
 */

import { SheetRow, ApiResponse } from "@/lib/types";

const MASTER_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MASTER_ID || "";
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "";

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
      // Remove surrounding quotes if present
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

// Fallback: standard export URL (by gid)
function getExportUrl(spreadsheetId: string, gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

// Sheet name to GID mapping (fallback)
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

      // Try gviz/tq first (reads by sheet name)
      const gvizUrl = getGvizUrl(MASTER_SPREADSHEET_ID, sheetName);
      console.log(`[Sheets] Trying gviz URL: ${gvizUrl}`);

      let response = await fetch(gvizUrl, {
        method: "GET",
        cache: "no-store",
      });

      // If gviz fails, try standard export with GID
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
      console.log(`[Sheets] Raw CSV first 200 chars: ${csvText.substring(0, 200)}`);

      if (!csvText || csvText.trim().length === 0) {
        return { success: true, data: [] };
      }

      const records = parseCSV(csvText);
      console.log(`[Sheets] Parsed ${records.length} records from '${sheetName}'`);

      if (records.length > 0) {
        console.log(`[Sheets] First record keys:`, Object.keys(records[0]));
        console.log(`[Sheets] First record sample:`, records[0]);
      }

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
   * Append a row via Google Apps Script Web App
   */
  async appendRow(
    sheetName: string,
    values: (string | number)[]
  ): Promise<ApiResponse<void>> {
    try {
      if (!APPS_SCRIPT_URL) {
        return { success: false, error: "Apps Script URL not configured" };
      }

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetName, values }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || "Append failed" };
      }

      return { success: true, message: "Row appended successfully" };
    } catch (error) {
      console.error(`[Sheets] Error appending row to ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to append row to sheet: ${sheetName}`,
      };
    }
  }

  /**
   * Append a row with headers (for creating new sheets)
   */
  async appendRowWithHeaders(
    sheetName: string,
    headers: string[],
    values: (string | number)[]
  ): Promise<ApiResponse<void>> {
    try {
      if (!APPS_SCRIPT_URL) {
        return { success: false, error: "Apps Script URL not configured" };
      }

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetName, headers, values }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || "Append failed" };
      }

      return { success: true, message: "Row appended successfully" };
    } catch (error) {
      console.error(`[Sheets] Error appending row to ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to append row to sheet: ${sheetName}`,
      };
    }
  }

  /**
   * Update a row - NOT supported
   */
  async updateRow(): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: "Update not supported in public sheets mode.",
    };
  }

  /**
   * Delete a row - NOT supported
   */
  async deleteRow(): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: "Delete not supported in public sheets mode.",
    };
  }

  /**
   * Find a row index by primary key value
   */
  async findRowIndex(
    sheetName: string,
    primaryKeyColumn: string,
    primaryKeyValue: string
  ): Promise<number | null> {
    try {
      const result = await this.readSheet(sheetName);
      if (!result.success || !result.data) return null;

      for (let i = 0; i < result.data.length; i++) {
        if (result.data[i][primaryKeyColumn] === primaryKeyValue) {
          return i + 2;
        }
      }

      return null;
    } catch (error) {
      console.error(`[Sheets] Error finding row in ${sheetName}:`, error);
      return null;
    }
  }
}

// Singleton instance
export const sheetsRepository = new GoogleSheetsRepository();
