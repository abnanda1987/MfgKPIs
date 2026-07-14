/**
 * Authentication Service
 * 
 * Handles user authentication against the User sheet in Google Sheets.
 * Only Admin users are allowed to log in (per Phase 1 requirements).
 */

import { MasterDataRepository } from "@/lib/repositories/master-data";
import { AuthUser, LoginCredentials, ApiResponse, SheetRow } from "@/lib/types";

export class AuthService {
  /**
   * Authenticate a user by email and password
   * Only Admin users can log in (Phase 1 requirement)
   */
  static async authenticate(
    credentials: LoginCredentials
  ): Promise<ApiResponse<AuthUser>> {
    try {
      const result = await MasterDataRepository.getAll("User");

      if (!result.success || !result.data) {
        console.error("Auth: Failed to fetch user data:", result.error);
        return { success: false, error: "Failed to fetch user data" };
      }

      console.log("Auth: Fetched", result.data.length, "users");

      // Debug: log first few users
      result.data.slice(0, 3).forEach((u, i) => {
        console.log(`Auth: User ${i}:`, {
          email: u["Email"],
          role: u["User Role"],
          password: u["Password"],
        });
      });

      const inputEmail = credentials.email.trim().toLowerCase();
      const inputPassword = credentials.password.trim();

      const user = result.data.find((row: SheetRow) => {
        const sheetEmail = String(row["Email"] ?? "").trim().toLowerCase();
        const sheetPassword = String(row["Password"] ?? "").trim();
        const match = sheetEmail === inputEmail && sheetPassword === inputPassword;
        if (sheetEmail === inputEmail) {
          console.log("Auth: Email match found:", sheetEmail, "password match:", match);
        }
        return match;
      });

      if (!user) {
        console.log("Auth: No user found for email:", inputEmail);
        return { success: false, error: "Invalid email or password" };
      }

      // Phase 1: Only Admin users can log in
      const userRole = String(user["User Role"] ?? "").trim();
      console.log("Auth: User role:", userRole);

      if (userRole !== "Admin") {
        return {
          success: false,
          error: "Access denied. Only Admin users can log in.",
        };
      }

      const authUser: AuthUser = {
        email: String(user["Email"]).trim(),
        role: userRole,
        plantId: String(user["Associated Plant ID"]).trim(),
        firstName: String(user["First Name"]).trim(),
        lastName: String(user["Last Name"]).trim(),
      };

      console.log("Auth: Success for", authUser.email);
      return { success: true, data: authUser };
    } catch (error) {
      console.error("Authentication error:", error);
      return { success: false, error: "Authentication failed" };
    }
  }

  /**
   * Get user by email (for session validation)
   */
  static async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const result = await MasterDataRepository.getAll("User");
      if (!result.success || !result.data) return null;

      const user = result.data.find((row: SheetRow) => 
        String(row["Email"] ?? "").trim().toLowerCase() === email.trim().toLowerCase()
      );
      if (!user) return null;

      return {
        email: String(user["Email"]).trim(),
        role: String(user["User Role"]).trim(),
        plantId: String(user["Associated Plant ID"]).trim(),
        firstName: String(user["First Name"]).trim(),
        lastName: String(user["Last Name"]).trim(),
      };
    } catch {
      return null;
    }
  }
}
