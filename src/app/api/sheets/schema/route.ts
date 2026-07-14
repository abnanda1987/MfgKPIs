/**
 * GET /api/sheets/schema?sheet={sheetName}
 * 
 * Returns the schema for a given master sheet.
 */

import { NextRequest, NextResponse } from "next/server";
import { MasterDataRepository } from "@/lib/repositories/master-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheet");

    if (!sheetName) {
      return NextResponse.json(
        { success: false, error: "Sheet parameter is required" },
        { status: 400 }
      );
    }

    const schema = MasterDataRepository.getSchema(sheetName);

    if (!schema) {
      return NextResponse.json(
        { success: false, error: `Schema not found for sheet: ${sheetName}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    console.error("Schema API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch schema" },
      { status: 500 }
    );
  }
}
