/**
 * GET /api/sheets/lookup?sheet={sheetName}&column={columnName}
 * 
 * Returns distinct values from a lookup sheet for dropdowns.
 */

import { NextRequest, NextResponse } from "next/server";
import { MasterDataRepository } from "@/lib/repositories/master-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheet");
    const columnName = searchParams.get("column");

    if (!sheetName || !columnName) {
      return NextResponse.json(
        { success: false, error: "Sheet and column parameters are required" },
        { status: 400 }
      );
    }

    const result = await MasterDataRepository.getLookupValues(
      sheetName,
      columnName
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Lookup API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lookup values" },
      { status: 500 }
    );
  }
}
