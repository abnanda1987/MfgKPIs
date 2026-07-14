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
        return { success: false, error: "Failed to fetch user data" };
      }

      const user = result.data.find(
        (row: SheetRow) =>
          row["Email"] === credentials.email &&
          row["Password"] === credentials.password
      );

      if (!user) {
        return { success: false, error: "Invalid email or password" };
      }

      // Phase 1: Only Admin users can log in
      if (user["User Role"] !== "Admin") {
        return {
          success: false,
          error: "Access denied. Only Admin users can log in.",
        };
      }

      const authUser: AuthUser = {
        email: String(user["Email"]),
        role: String(user["User Role"]),
        plantId: String(user["Associated Plant ID"]),
        firstName: String(user["First Name"]),
        lastName: String(user["Last Name"]),
      };

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

      const user = result.data.find((row: SheetRow) => row["Email"] === email);
      if (!user) return null;

      return {
        email: String(user["Email"]),
        role: String(user["User Role"]),
        plantId: String(user["Associated Plant ID"]),
        firstName: String(user["First Name"]),
        lastName: String(user["Last Name"]),
      };
    } catch {
      return null;
    }
  }
}
