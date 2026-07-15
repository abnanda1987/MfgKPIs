/**
 * POST /api/simulator/run
 * 
 * Fast batch simulator - generates all records in memory, 
 * then sends one batch write to Apps Script.
 * Target: ~15 seconds for 100s of records.
 */

import { NextRequest, NextResponse } from "next/server";
import { sheetsRepository } from "@/lib/repositories/google-sheets";
import { MasterDataRepository } from "@/lib/repositories/master-data";
import {
  SimulatorConfig,
  ProductionRun,
  MachineOperation,
  KPISnapshot,
  ProductionProblem,
  CorrectiveAction,
  AlertLog,
  SimulationRun,
  SheetRow,
} from "@/lib/types";

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "";

// ============================================================
// Helpers
// ============================================================

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// Scenario Configs
// ============================================================

const SCENARIO_CONFIGS = {
  normal: {
    plannedQtyMultiplier: 1.0,
    actualQtyVariance: 0.05,
    rejectRate: 0.02,
    downtimeMultiplier: 1.0,
    energyMultiplier: 1.0,
    problemChance: 0.05,
  },
  high_production: {
    plannedQtyMultiplier: 1.3,
    actualQtyVariance: 0.08,
    rejectRate: 0.03,
    downtimeMultiplier: 0.7,
    energyMultiplier: 1.2,
    problemChance: 0.08,
  },
  machine_breakdown: {
    plannedQtyMultiplier: 0.8,
    actualQtyVariance: 0.15,
    rejectRate: 0.04,
    downtimeMultiplier: 2.5,
    energyMultiplier: 1.1,
    problemChance: 0.25,
  },
  quality_issues: {
    plannedQtyMultiplier: 1.0,
    actualQtyVariance: 0.1,
    rejectRate: 0.12,
    downtimeMultiplier: 1.2,
    energyMultiplier: 1.0,
    problemChance: 0.2,
  },
};

const TRANSACTION_HEADERS: Record<string, string[]> = {
  Production_Run: ["Run ID", "Plant ID", "Line ID", "Product ID", "Date", "Shift", "Planned Quantity", "Actual Quantity", "Reject Quantity", "Status"],
  Machine_Operation: ["Operation ID", "Machine ID", "Run ID", "Date", "Shift", "Planned Runtime (Min)", "Actual Runtime (Min)", "Downtime (Min)", "Energy Consumed (kWh)", "Status"],
  KPI_Snapshot: ["Snapshot ID", "Plant ID", "Date", "Shift", "KPI", "Value", "Target", "Status"],
  Production_Problem: ["Problem ID", "Run ID", "Machine ID", "Line ID", "Date", "Shift", "Problem", "Category", "Severity", "Description", "Status"],
  Corrective_Action: ["Action ID", "Problem ID", "Date", "Action", "Assigned To", "Status"],
  Alert_Log: ["Alert ID", "Plant ID", "Date", "KPI", "Value", "Threshold", "Level", "Message", "Status"],
  Simulation_Run: ["Simulation ID", "Plant ID", "Start Date", "End Date", "Scenario", "Randomness (%)", "Records Generated", "Generated At"],
};

// ============================================================
// Fast Simulator Engine (batch mode)
// ============================================================

class ManufacturingSimulator {
  private config: SimulatorConfig;
  private simulationId: string;
  private recordsGenerated = 0;
  private sheetsCreated: string[] = [];

  // Batched data
  private batchData: Record<string, (string | number)[][]> = {};

  // Master data caches
  private machines: SheetRow[] = [];
  private lines: SheetRow[] = [];
  private products: SheetRow[] = [];
  private shifts = ["S1", "S2", "S3"];
  private kpis: SheetRow[] = [];
  private alertThresholds: SheetRow[] = [];
  private problems: SheetRow[] = [];

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.simulationId = generateId("SIM");
    // Initialize batch arrays
    Object.keys(TRANSACTION_HEADERS).forEach(sheet => {
      this.batchData[sheet] = [];
    });
  }

  async loadMasterData(): Promise<void> {
    const [machinesRes, linesRes, deptsRes, productsRes, kpisRes, thresholdsRes, problemsRes] =
      await Promise.all([
        MasterDataRepository.getAll("Machine"),
        MasterDataRepository.getAll("ProductionLine"),
        MasterDataRepository.getAll("Department"),
        MasterDataRepository.getAll("Product_SKU"),
        MasterDataRepository.getAll("KPI"),
        MasterDataRepository.getAll("AlertThreshold"),
        MasterDataRepository.getAll("Problem"),
      ]);

    this.machines = machinesRes.data || [];
    this.lines = linesRes.data || [];
    this.products = productsRes.data || [];
    this.kpis = kpisRes.data || [];
    this.alertThresholds = thresholdsRes.data || [];
    this.problems = problemsRes.data || [];

    // Filter by plant
    this.machines = this.machines.filter((m) =>
      String(m["Associated Line"]).startsWith(this.config.plantId)
    );
    this.lines = this.lines.filter((l) =>
      String(l["Associated Department"]).startsWith(this.config.plantId)
    );
    this.products = this.products.filter((p) =>
      String(p["Associated Department ID"]).startsWith(this.config.plantId)
    );
    this.kpis = this.kpis.filter((k) =>
      String(k["Plant ID"]) === this.config.plantId
    );
    this.alertThresholds = this.alertThresholds.filter((t) =>
      String(t["Plant ID"]) === this.config.plantId
    );
  }

  async run(): Promise<{
    simulationId: string;
    plantId: string;
    startDate: string;
    endDate: string;
    scenario: string;
    randomness: number;
    recordsGenerated: number;
    sheetsCreated: string[];
  }> {
    await this.loadMasterData();

    const scenarioConfig = SCENARIO_CONFIGS[this.config.scenario];
    const endDate = addDays(this.config.startDate, this.config.numberOfDays - 1);

    // Generate all data in memory (no network calls)
    for (let day = 0; day < this.config.numberOfDays; day++) {
      const currentDate = addDays(this.config.startDate, day);

      for (const shift of this.shifts) {
        for (const line of this.lines) {
          const lineMachines = this.machines.filter(
            (m) => m["Associated Line"] === line["Line ID"]
          );
          const lineProducts = this.products.filter(
            (p) => p["Associated Department ID"] === line["Associated Department"]
          );

          if (lineMachines.length === 0 || lineProducts.length === 0) continue;

          const product = pickRandom(lineProducts);
          const plannedQty = Math.round(500 * scenarioConfig.plannedQtyMultiplier * randomInRange(0.9, 1.1));
          const variance = randomInRange(-scenarioConfig.actualQtyVariance, scenarioConfig.actualQtyVariance);
          const actualQty = Math.round(plannedQty * (1 + variance));
          const rejectQty = Math.round(actualQty * scenarioConfig.rejectRate * randomInRange(0.5, 1.5));
          const runId = generateId("RUN");

          // Production Run
          this.batchData["Production_Run"].push([
            runId, this.config.plantId, String(line["Line ID"]), String(product["Product ID"]),
            currentDate, shift, plannedQty, actualQty, rejectQty,
            actualQty >= plannedQty * 0.9 ? "Completed" : "Partial",
          ]);
          this.recordsGenerated++;

          // Machine Operations
          for (const machine of lineMachines) {
            const plannedRuntime = 480;
            const downtime = Math.round(
              (Number(machine["Downtime Target (Min)"]) || 30) *
              scenarioConfig.downtimeMultiplier * randomInRange(0.3, 1.5)
            );
            const actualRuntime = Math.max(0, plannedRuntime - downtime);
            const energyConsumed = (Number(machine["Energy Consumption (kWh)"]) || 10) * (actualRuntime / 60) * scenarioConfig.energyMultiplier;

            this.batchData["Machine_Operation"].push([
              generateId("OP"), String(machine["Machine ID"]), runId, currentDate, shift,
              plannedRuntime, actualRuntime, downtime,
              Math.round(energyConsumed * 100) / 100,
              downtime > 60 ? "Issue" : "Normal",
            ]);
            this.recordsGenerated++;
          }

          // KPI Snapshots
          const oee = Math.round(((actualQty / plannedQty) * 0.95 + (1 - scenarioConfig.downtimeMultiplier * 0.1)) * 50);
          const availability = Math.round(100 - scenarioConfig.downtimeMultiplier * 2 * randomInRange(0.8, 1.2));
          const performance = Math.round((actualQty / plannedQty) * 100);
          const quality = Math.round(((actualQty - rejectQty) / Math.max(actualQty, 1)) * 100);

          const kpiValues = [
            { kpi: "OEE", value: Math.min(100, Math.max(0, oee)) },
            { kpi: "Availability", value: Math.min(100, Math.max(0, availability)) },
            { kpi: "Performance", value: Math.min(100, Math.max(0, performance)) },
            { kpi: "Quality", value: Math.min(100, Math.max(0, quality)) },
            { kpi: "Downtime", value: Math.round(scenarioConfig.downtimeMultiplier * 30 * randomInRange(0.8, 1.5)) },
          ];

          for (const kv of kpiValues) {
            const kpiDef = this.kpis.find((k) => k["KPI"] === kv.kpi);
            const threshold = this.alertThresholds.find((t) => t["KPI"] === kv.kpi);

            let status = "Normal";
            let level = "";

            if (threshold) {
              const warning = Number(threshold["Warning"]);
              const critical = Number(threshold["Critical"]);
              if (kv.kpi === "Downtime") {
                if (kv.value >= critical) { status = "Critical"; level = "Critical"; }
                else if (kv.value >= warning) { status = "Warning"; level = "Warning"; }
              } else {
                if (kv.value <= critical) { status = "Critical"; level = "Critical"; }
                else if (kv.value <= warning) { status = "Warning"; level = "Warning"; }
              }
            }

            this.batchData["KPI_Snapshot"].push([
              generateId("KPI"), this.config.plantId, currentDate, shift,
              kv.kpi, kv.value, Number(kpiDef?.["Target"] || 0), status,
            ]);
            this.recordsGenerated++;

            if (level) {
              this.batchData["Alert_Log"].push([
                generateId("ALERT"), this.config.plantId, currentDate, kv.kpi,
                kv.value, Number(threshold?.["Warning"] || 0), level,
                `${kv.kpi} is at ${kv.value}${kpiDef?.["Unit"] || ""} - ${level} threshold breached`,
                "Open",
              ]);
              this.recordsGenerated++;
            }
          }

          // Production Problems
          if (Math.random() < scenarioConfig.problemChance) {
            const problemDef = pickRandom(this.problems);
            if (problemDef) {
              const probId = generateId("PROB");
              this.batchData["Production_Problem"].push([
                probId, runId, String(problemDef["Associated Machine"] || ""),
                String(line["Line ID"]), currentDate, shift,
                String(problemDef["Problem"] || "Unknown"), "Equipment",
                pickRandom(["Critical", "High", "Medium", "Low"]),
                String(problemDef["Description"] || ""), "Open",
              ]);
              this.recordsGenerated++;

              this.batchData["Corrective_Action"].push([
                generateId("ACT"), probId, currentDate,
                `Investigate and resolve ${problemDef["Problem"] || "Unknown"}`,
                "Engineer", "Pending",
              ]);
              this.recordsGenerated++;
            }
          }
        }
      }
    }

    // Simulation Run record
    this.batchData["Simulation_Run"].push([
      this.simulationId, this.config.plantId, this.config.startDate, endDate,
      this.config.scenario, this.config.randomness, this.recordsGenerated,
      new Date().toISOString(),
    ]);
    this.recordsGenerated++;

    // BATCH WRITE: Send all data to Apps Script in parallel
    const writePromises = Object.entries(this.batchData)
      .filter(([_, rows]) => rows.length > 0)
      .map(([sheetName, rows]) => {
        this.sheetsCreated.push(sheetName);
        return sheetsRepository.batchAppend(
          sheetName,
          TRANSACTION_HEADERS[sheetName] || [],
          rows
        );
      });

    await Promise.all(writePromises);

    return {
      simulationId: this.simulationId,
      plantId: this.config.plantId,
      startDate: this.config.startDate,
      endDate,
      scenario: this.config.scenario,
      randomness: this.config.randomness,
      recordsGenerated: this.recordsGenerated,
      sheetsCreated: this.sheetsCreated,
    };
  }
}

// ============================================================
// API Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    if (!APPS_SCRIPT_URL) {
      return NextResponse.json(
        { success: false, error: "Apps Script URL not configured" },
        { status: 500 }
      );
    }

    const config: SimulatorConfig = await request.json();

    if (!config.plantId || !config.startDate || !config.numberOfDays || !config.scenario) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (config.numberOfDays < 1 || config.numberOfDays > 30) {
      return NextResponse.json(
        { success: false, error: "Number of days must be between 1 and 30" },
        { status: 400 }
      );
    }

    const simulator = new ManufacturingSimulator(config);
    const result = await simulator.run();

    return NextResponse.json({
      success: true,
      data: result,
      message: "Simulation completed successfully",
    });
  } catch (error) {
    console.error("Simulator error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Simulation failed" },
      { status: 500 }
    );
  }
}
