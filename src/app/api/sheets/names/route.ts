/**
 * GET /api/sheets/names
 * 
 * Returns all available master sheet names.
 */

import { NextResponse } from "next/server";
import { MasterDataRepository } from "@/lib/repositories/master-data";

export async function GET() {
  try {
    const names = MasterDataRepository.getSheetNames();
    return NextResponse.json({
      success: true,
      data: names,
    });
  } catch (error) {
    console.error("Sheet names API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sheet names" },
      { status: 500 }
    );
  }
}
