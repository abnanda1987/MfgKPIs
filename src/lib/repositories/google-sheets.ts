/**
 * Google Sheets Repository - Public Sheets (No API Key)
 * 
 * Reads via public CSV export URLs.
 * Writes via Google Apps Script Web App.
 * 
 * Architecture: Google Sheets (public) -> Repository -> Services -> API Routes -> Components
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

  // Parse headers (first row)
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const records: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: SheetRow = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
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
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================================
// Public CSV Export URLs
// ============================================================

function getCSVExportUrl(spreadsheetId: string, sheetGid: number): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetGid}`;
}

// Sheet name to GID mapping for the master workbook
// GID 0 = first sheet, then increments
const SHEET_GID_MAP: Record<string, number> = {
  Enterprise: 0,
  Country: 1,
  City: 2,
  Plant: 3,
  Department: 4,
  ProductionLine: 5,
  Machine: 6,
  Product_SKU: 7,
  User: 8,
  Problem: 9,
  Role: 10,
  Shift: 11,
  KPI: 12,
  AlertThreshold: 13,
  ProblemCategory: 14,
  Severity: 15,
  Status: 16,
  Calendar: 17,
};

// ============================================================
// Core Sheet Operations
// ============================================================

export class GoogleSheetsRepository {
  /**
   * Read all data from a public sheet via CSV export
   */
  async readSheet(sheetName: string): Promise<ApiResponse<SheetRow[]>> {
    try {
      if (!MASTER_SPREADSHEET_ID) {
        return { success: false, error: "Master spreadsheet ID not configured" };
      }

      const gid = SHEET_GID_MAP[sheetName];
      if (gid === undefined) {
        return { success: false, error: `Unknown sheet: ${sheetName}` };
      }

      const url = getCSVExportUrl(MASTER_SPREADSHEET_ID, gid);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch sheet: ${response.status} ${response.statusText}`,
        };
      }

      const csvText = await response.text();
      const records = parseCSV(csvText);

      return { success: true, data: records };
    } catch (error) {
      console.error(`Error reading sheet ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to read sheet: ${sheetName}`,
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
        body: JSON.stringify({
          sheetName,
          values,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || "Append failed" };
      }

      return { success: true, message: "Row appended successfully" };
    } catch (error) {
      console.error(`Error appending row to ${sheetName}:`, error);
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
        body: JSON.stringify({
          sheetName,
          headers,
          values,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || "Append failed" };
      }

      return { success: true, message: "Row appended successfully" };
    } catch (error) {
      console.error(`Error appending row to ${sheetName}:`, error);
      return {
        success: false,
        error: `Failed to append row to sheet: ${sheetName}`,
      };
    }
  }

  /**
   * Update a row - NOT supported via public CSV/Apps Script approach
   * Returns error; would need row index tracking or different approach
   */
  async updateRow(
    _sheetName: string,
    _rowIndex: number,
    _values: (string | number)[]
  ): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: "Update not supported in public sheets mode. Use delete + create instead.",
    };
  }

  /**
   * Delete a row - NOT supported via public CSV/Apps Script approach
   */
  async deleteRow(_sheetName: string, _rowIndex: number): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: "Delete not supported in public sheets mode.",
    };
  }

  /**
   * Find a row index by primary key value
   * Returns the 1-based row index (header = row 1)
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
          return i + 2; // +2 because: +1 for 0->1-based, +1 for header row
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding row in ${sheetName}:`, error);
      return null;
    }
  }
}

// Singleton instance
export const sheetsRepository = new GoogleSheetsRepository();
