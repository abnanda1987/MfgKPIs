/**
 * Generic CRUD API for Master Data Sheets
 * 
 * GET    /api/sheets/{sheetName}     -> Read all records
 * POST   /api/sheets/{sheetName}     -> Create record
 * PUT    /api/sheets/{sheetName}     -> Update record (id in body)
 * DELETE /api/sheets/{sheetName}     -> Delete record (id in body)
 */

import { NextRequest, NextResponse } from "next/server";
import { MasterDataRepository } from "@/lib/repositories/master-data";
import { SheetRow } from "@/lib/types";

// GET - Read all records from a sheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sheetName: string }> }
) {
  try {
    const { sheetName } = await params;
    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get("plantId");

    let result;
    if (plantId) {
      result = await MasterDataRepository.getByPlant(sheetName, plantId);
    } else {
      result = await MasterDataRepository.getAll(sheetName);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      sheetName,
    });
  } catch (error) {
    console.error("GET sheets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// POST - Create a new record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sheetName: string }> }
) {
  try {
    const { sheetName } = await params;
    const body: SheetRow = await request.json();

    const result = await MasterDataRepository.create(sheetName, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Record created successfully",
    });
  } catch (error) {
    console.error("POST sheets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create record" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sheetName: string }> }
) {
  try {
    const { sheetName } = await params;
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required for update" },
        { status: 400 }
      );
    }

    const result = await MasterDataRepository.update(sheetName, id, data);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Record updated successfully",
    });
  } catch (error) {
    console.error("PUT sheets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update record" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sheetName: string }> }
) {
  try {
    const { sheetName } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required for deletion" },
        { status: 400 }
      );
    }

    const result = await MasterDataRepository.delete(sheetName, id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("DELETE sheets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete record" },
      { status: 500 }
    );
  }
}
