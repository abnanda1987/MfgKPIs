/**
 * POST /api/auth/login
 * 
 * Authenticates a user and returns user data.
 * Expects: { email: string, password: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth";
import { LoginCredentials } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await AuthService.authenticate(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
