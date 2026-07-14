/**
 * Core type definitions for the Manufacturing KPI Management Solution.
 * All types are derived from the Master Data Design Document V3.
 */

// ============================================================
// Generic Types
// ============================================================

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

export interface SheetColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'email' | 'password';
  required?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  lookupSheet?: string;
  lookupColumn?: string;
}

export interface SheetSchema {
  sheetName: string;
  columns: SheetColumn[];
  primaryKey: string;
  hasPlantFilter?: boolean;
  plantColumn?: string;
}

export interface CrudOperation {
  type: 'create' | 'read' | 'update' | 'delete';
  sheetName: string;
  data?: SheetRow;
  id?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================
// Entity Types (derived from Master Data Design)
// ============================================================

export interface Enterprise {
  'Enterprise ID': string;
  'Enterprise Name': string;
  'HQ Country': string;
  Description: string;
}

export interface Country {
  'Country Code': string;
  'Country Name': string;
}

export interface City {
  'City ID': string;
  'City Name': string;
  Country: string;
}

export interface Plant {
  'Plant ID': string;
  'Plant Name': string;
  'Plant Location': string;
  'Associated Enterprise ID': string;
  Description: string;
}

export interface Department {
  'Department ID': string;
  'Department Name': string;
  'Associated Plant ID': string;
  Description: string;
}

export interface ProductionLine {
  'Line ID': string;
  'Line Name': string;
  'Associated Department': string;
  Description: string;
}

export interface Machine {
  'Machine ID': string;
  'Machine Name': string;
  'Manufacturing date': string;
  'Installation date': string;
  'Last Service': string;
  'Next Service': string;
  'Associated Line': string;
  Description: string;
  'Machine Type': string;
  'Station Sequence': number;
  'Cycle Time (Sec)': number;
  'Energy Consumption (kWh)': number;
  'Availability Target (%)': number;
  'Downtime Target (Min)': number;
}

export interface ProductSKU {
  'Product Name': string;
  'Product Description': string;
  Variant: string;
  'Product ID': string;
  'Associated Department ID': string;
  Status: string;
}

export interface User {
  'First Name': string;
  'Last Name': string;
  Email: string;
  'Phone Number': string;
  'User Role': string;
  'Associated Plant ID': string;
  Password: string;
}

export interface Problem {
  Problem: string;
  'Associated Machine': string;
  'Associated Line': string;
  'Associated Department': string;
  Description: string;
}

export interface Role {
  Role: string;
  Description: string;
}

export interface Shift {
  'Shift ID': string;
  'Shift Name': string;
  Start: string;
  End: string;
}

export interface KPI {
  'Plant ID': string;
  KPI: string;
  Unit: string;
  Target: number;
}

export interface AlertThreshold {
  'Plant ID': string;
  KPI: string;
  Warning: number;
  Critical: number;
}

export interface ProblemCategory {
  Category: string;
  Description: string;
}

export interface Severity {
  Severity: string;
  Priority: number;
}

export interface Status {
  Status: string;
}

export interface Calendar {
  'Calendar ID': string;
  Date: string;
  Week: number;
  Month: number;
  Quarter: number;
  Year: number;
  Day: string;
  Weekend: string;
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthUser {
  email: string;
  role: string;
  plantId: string;
  firstName: string;
  lastName: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ============================================================
// Simulator Types
// ============================================================

export interface SimulatorConfig {
  plantId: string;
  startDate: string;
  numberOfDays: number;
  scenario: 'normal' | 'high_production' | 'machine_breakdown' | 'quality_issues';
  randomness: number; // 0-100
}

export interface ProductionRun {
  'Run ID': string;
  'Plant ID': string;
  'Line ID': string;
  'Product ID': string;
  Date: string;
  Shift: string;
  'Planned Quantity': number;
  'Actual Quantity': number;
  'Reject Quantity': number;
  Status: string;
}

export interface MachineOperation {
  'Operation ID': string;
  'Machine ID': string;
  'Run ID': string;
  Date: string;
  Shift: string;
  'Planned Runtime (Min)': number;
  'Actual Runtime (Min)': number;
  'Downtime (Min)': number;
  'Energy Consumed (kWh)': number;
  Status: string;
}

export interface KPISnapshot {
  'Snapshot ID': string;
  'Plant ID': string;
  Date: string;
  Shift: string;
  KPI: string;
  Value: number;
  Target: number;
  Status: string;
}

export interface ProductionProblem {
  'Problem ID': string;
  'Run ID': string;
  'Machine ID': string;
  'Line ID': string;
  Date: string;
  Shift: string;
  Problem: string;
  Category: string;
  Severity: string;
  Description: string;
  Status: string;
}

export interface CorrectiveAction {
  'Action ID': string;
  'Problem ID': string;
  Date: string;
  Action: string;
  'Assigned To': string;
  Status: string;
}

export interface AlertLog {
  'Alert ID': string;
  'Plant ID': string;
  Date: string;
  KPI: string;
  Value: number;
  Threshold: number;
  Level: string;
  Message: string;
  Status: string;
}

export interface SimulationRun {
  'Simulation ID': string;
  'Plant ID': string;
  'Start Date': string;
  'End Date': string;
  Scenario: string;
  'Randomness (%)': number;
  'Records Generated': number;
  'Generated At': string;
}
