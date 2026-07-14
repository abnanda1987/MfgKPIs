"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Play,
  Loader2,
  Cpu,
  Factory,
  Calendar,
  Shuffle,
  AlertCircle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

interface Plant {
  "Plant ID": string;
  "Plant Name": string;
}

interface SimulationResult {
  simulationId: string;
  plantId: string;
  startDate: string;
  endDate: string;
  scenario: string;
  randomness: number;
  recordsGenerated: number;
  sheetsCreated: string[];
}

const SCENARIOS = [
  { value: "normal", label: "Normal Operation", description: "Standard production with typical variations" },
  { value: "high_production", label: "High Production", description: "Increased output targets and faster cycles" },
  { value: "machine_breakdown", label: "Machine Breakdown", description: "Unexpected downtime and reduced availability" },
  { value: "quality_issues", label: "Quality Issues", description: "Higher reject rates and quality problems" },
];

export default function SimulatorPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState("");
  const [startDate, setStartDate] = useState("");
  const [numberOfDays, setNumberOfDays] = useState(7);
  const [scenario, setScenario] = useState("normal");
  const [randomness, setRandomness] = useState(20);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPlants, setIsFetchingPlants] = useState(true);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");

  // Fetch plants on mount
  useEffect(() => {
    async function fetchPlants() {
      try {
        const res = await fetch("/api/sheets/Plant");
        const data = await res.json();
        if (data.success && data.data) {
          setPlants(data.data);
          if (data.data.length > 0) {
            setSelectedPlant(data.data[0]["Plant ID"]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch plants:", err);
      } finally {
        setIsFetchingPlants(false);
      }
    }
    fetchPlants();

    // Set default start date to today
    setStartDate(new Date().toISOString().split("T")[0]);
  }, []);

  const handleRunSimulation = async () => {
    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/simulator/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId: selectedPlant,
          startDate,
          numberOfDays,
          scenario,
          randomness,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Simulation failed");
      }
    } catch (err) {
      setError("Failed to run simulation");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Cpu className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Manufacturing Simulator</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Simulation Configuration
                </CardTitle>
                <CardDescription>
                  Configure the parameters for your manufacturing simulation run.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Plant Selection */}
                <div className="space-y-2">
                  <Label htmlFor="plant">Plant</Label>
                  <Select
                    value={selectedPlant}
                    onValueChange={setSelectedPlant}
                    disabled={isFetchingPlants}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map((plant) => (
                        <SelectItem
                          key={plant["Plant ID"]}
                          value={plant["Plant ID"]}
                        >
                          {plant["Plant Name"]} ({plant["Plant ID"]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* Number of Days */}
                <div className="space-y-2">
                  <Label htmlFor="days">Number of Days</Label>
                  <Input
                    id="days"
                    type="number"
                    min={1}
                    max={30}
                    value={numberOfDays}
                    onChange={(e) =>
                      setNumberOfDays(parseInt(e.target.value) || 1)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Simulate up to 30 days of production data
                  </p>
                </div>

                {/* Scenario */}
                <div className="space-y-2">
                  <Label>Scenario</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {SCENARIOS.map((s) => (
                      <div
                        key={s.value}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          scenario === s.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-accent"
                        }`}
                        onClick={() => setScenario(s.value)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{s.label}</span>
                          {scenario === s.value && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Randomness */}
                <div className="space-y-2">
                  <Label htmlFor="randomness">
                    <Shuffle className="inline h-4 w-4 mr-1" />
                    Randomness: {randomness}%
                  </Label>
                  <Input
                    id="randomness"
                    type="range"
                    min={0}
                    max={100}
                    value={randomness}
                    onChange={(e) =>
                      setRandomness(parseInt(e.target.value))
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Predictable</span>
                    <span>Highly Random</span>
                  </div>
                </div>

                <Separator />

                {/* Run Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleRunSimulation}
                  disabled={isLoading || !selectedPlant || !startDate}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Run Simulation
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Simulation Results
                </CardTitle>
                <CardDescription>
                  Output from the last simulation run
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!result && !isLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Cpu className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No simulation run yet</p>
                    <p className="text-sm mt-1">
                      Configure parameters and click Run Simulation
                    </p>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-lg font-medium">Running Simulation</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generating production data across {numberOfDays} days...
                    </p>
                    <div className="mt-4 space-y-2 max-w-xs mx-auto">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
                      </div>
                    </div>
                  </div>
                )}

                {result && !isLoading && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Simulation Complete</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Generated {result.recordsGenerated.toLocaleString()} records
                        across {result.sheetsCreated.length} sheets
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Simulation ID</p>
                          <p className="font-mono text-sm font-medium">{result.simulationId}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Plant</p>
                          <p className="font-medium text-sm">{result.plantId}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Date Range</p>
                          <p className="font-medium text-sm">
                            {result.startDate} → {result.endDate}
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Scenario</p>
                          <p className="font-medium text-sm capitalize">{result.scenario.replace("_", " ")}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Sheets Created</p>
                        <div className="flex flex-wrap gap-2">
                          {result.sheetsCreated.map((sheet) => (
                            <Badge key={sheet} variant="secondary">
                              {sheet}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
