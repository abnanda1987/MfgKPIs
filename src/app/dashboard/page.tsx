"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
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
  Factory,
  Cpu,
  LogOut,
  ChevronRight,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Gauge,
  Timer,
  Zap,
  ArrowRight,
} from "lucide-react";

interface OEEMetrics {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  plannedQty: number;
  actualQty: number;
  rejectQty: number;
  downtime: number;
  runtime: number;
}

interface MasterData {
  enterprises: SheetRow[];
  plants: SheetRow[];
  departments: SheetRow[];
  lines: SheetRow[];
  machines: SheetRow[];
}

interface SheetRow {
  [key: string]: string | number;
}

const MASTER_CARDS = [
  { name: "Enterprise", icon: Factory, color: "bg-blue-50 text-blue-600" },
  { name: "Country", icon: Factory, color: "bg-green-50 text-green-600" },
  { name: "City", icon: Factory, color: "bg-emerald-50 text-emerald-600" },
  { name: "Plant", icon: Factory, color: "bg-indigo-50 text-indigo-600" },
  { name: "Department", icon: Factory, color: "bg-violet-50 text-violet-600" },
  { name: "ProductionLine", icon: Factory, color: "bg-purple-50 text-purple-600" },
  { name: "Machine", icon: Cpu, color: "bg-cyan-50 text-cyan-600" },
  { name: "Product_SKU", icon: Factory, color: "bg-amber-50 text-amber-600" },
  { name: "User", icon: Factory, color: "bg-rose-50 text-rose-600" },
  { name: "Problem", icon: Factory, color: "bg-red-50 text-red-600" },
  { name: "Role", icon: Factory, color: "bg-slate-50 text-slate-600" },
  { name: "Shift", icon: Factory, color: "bg-orange-50 text-orange-600" },
  { name: "KPI", icon: BarChart3, color: "bg-teal-50 text-teal-600" },
  { name: "AlertThreshold", icon: Factory, color: "bg-pink-50 text-pink-600" },
  { name: "ProblemCategory", icon: Factory, color: "bg-lime-50 text-lime-600" },
  { name: "Severity", icon: Factory, color: "bg-fuchsia-50 text-fuchsia-600" },
  { name: "Status", icon: Factory, color: "bg-gray-50 text-gray-600" },
  { name: "Calendar", icon: Factory, color: "bg-sky-50 text-sky-600" },
];

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  // OEE State
  const [masterData, setMasterData] = useState<MasterData>({
    enterprises: [], plants: [], departments: [], lines: [], machines: [],
  });
  const [selectedEnterprise, setSelectedEnterprise] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const [oeeMetrics, setOeeMetrics] = useState<OEEMetrics | null>(null);
  const [isLoadingOEE, setIsLoadingOEE] = useState(false);
  const [kpiData, setKpiData] = useState<SheetRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load master data
  const loadMasterData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [entRes, plantRes, deptRes, lineRes, machineRes, kpiRes] = await Promise.all([
        fetch("/api/sheets/Enterprise").then(r => r.json()),
        fetch("/api/sheets/Plant").then(r => r.json()),
        fetch("/api/sheets/Department").then(r => r.json()),
        fetch("/api/sheets/ProductionLine").then(r => r.json()),
        fetch("/api/sheets/Machine").then(r => r.json()),
        fetch("/api/sheets/KPI").then(r => r.json()),
      ]);

      setMasterData({
        enterprises: entRes.data || [],
        plants: plantRes.data || [],
        departments: deptRes.data || [],
        lines: lineRes.data || [],
        machines: machineRes.data || [],
      });
      setKpiData(kpiRes.data || []);

      // Auto-select first enterprise and plant
      if (entRes.data?.length > 0) {
        setSelectedEnterprise(String(entRes.data[0]["Enterprise ID"]));
      }
      if (plantRes.data?.length > 0) {
        setSelectedPlant(String(plantRes.data[0]["Plant ID"]));
      }
    } catch (err) {
      console.error("Failed to load master data:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Calculate OEE
  const calculateOEE = useCallback(async () => {
    if (!selectedPlant || !selectedDate) return;

    setIsLoadingOEE(true);
    try {
      // Fetch KPI snapshots for the selected date and plant
      const res = await fetch(`/api/sheets/KPI_Snapshot?plantId=${selectedPlant}&date=${selectedDate}`);
      const data = await res.json();

      const snapshots = data.data || [];

      // Aggregate KPIs
      const kpiMap: Record<string, number[]> = {};
      snapshots.forEach((s: SheetRow) => {
        const kpi = String(s["KPI"]);
        const val = Number(s["Value"]);
        if (!kpiMap[kpi]) kpiMap[kpi] = [];
        kpiMap[kpi].push(val);
      });

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const availability = avg(kpiMap["Availability"] || [85]);
      const performance = avg(kpiMap["Performance"] || [90]);
      const quality = avg(kpiMap["Quality"] || [95]);
      const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
      const downtime = avg(kpiMap["Downtime"] || [30]);

      // Get production data
      const runRes = await fetch(`/api/sheets/Production_Run?plantId=${selectedPlant}&date=${selectedDate}`);
      const runData = await runRes.json();
      const runs = runData.data || [];

      const plannedQty = runs.reduce((sum: number, r: SheetRow) => sum + Number(r["Planned Quantity"] || 0), 0);
      const actualQty = runs.reduce((sum: number, r: SheetRow) => sum + Number(r["Actual Quantity"] || 0), 0);
      const rejectQty = runs.reduce((sum: number, r: SheetRow) => sum + Number(r["Reject Quantity"] || 0), 0);

      setOeeMetrics({
        oee: Math.round(oee * 10) / 10,
        availability: Math.round(availability * 10) / 10,
        performance: Math.round(performance * 10) / 10,
        quality: Math.round(quality * 10) / 10,
        plannedQty,
        actualQty,
        rejectQty,
        downtime: Math.round(downtime * 10) / 10,
        runtime: Math.round((480 - downtime) * 10) / 10,
      });
    } catch (err) {
      console.error("OEE calculation failed:", err);
      // Fallback to demo values
      setOeeMetrics({
        oee: 72.5,
        availability: 85.0,
        performance: 90.0,
        quality: 95.0,
        plannedQty: 1500,
        actualQty: 1350,
        rejectQty: 45,
        downtime: 72,
        runtime: 408,
      });
    } finally {
      setIsLoadingOEE(false);
    }
  }, [selectedPlant, selectedDate]);

  useEffect(() => {
    calculateOEE();
  }, [calculateOEE]);

  // Filtered lists based on selections
  const filteredPlants = masterData.plants.filter(p => 
    !selectedEnterprise || String(p["Associated Enterprise ID"]) === selectedEnterprise
  );
  const filteredDepartments = masterData.departments.filter(d => 
    !selectedPlant || String(d["Associated Plant ID"]) === selectedPlant
  );
  const filteredLines = masterData.lines.filter(l => 
    !selectedDepartment || String(l["Associated Department"]) === selectedDepartment
  );
  const filteredMachines = masterData.machines.filter(m => 
    !selectedLine || String(m["Associated Line"]) === selectedLine
  );

  // OEE Color helper
  const getOEEColor = (value: number) => {
    if (value >= 85) return "text-green-600";
    if (value >= 60) return "text-amber-600";
    return "text-red-600";
  };
  const getOEEStatus = (value: number) => {
    if (value >= 85) return { icon: CheckCircle2, color: "bg-green-50 text-green-600", label: "World Class" };
    if (value >= 60) return { icon: AlertTriangle, color: "bg-amber-50 text-amber-600", label: "Acceptable" };
    return { icon: TrendingDown, color: "bg-red-50 text-red-600", label: "Needs Improvement" };
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  const oeeStatus = oeeMetrics ? getOEEStatus(oeeMetrics.oee) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Factory className="h-5 w-5 text-primary" /></div>
              <div>
                <h1 className="text-lg font-semibold">Manufacturing KPI</h1>
                <p className="text-xs text-muted-foreground">Phase 1 - OEE Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
              <Badge variant="secondary">{user.plantId}</Badge>
              <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OEE Dashboard Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              OEE Dashboard
            </h2>
            <Button variant="outline" size="sm" onClick={calculateOEE} disabled={isLoadingOEE}>
              {isLoadingOEE ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          {/* Hierarchy Selectors */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enterprise</label>
                  <Select value={selectedEnterprise} onValueChange={setSelectedEnterprise}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {masterData.enterprises.map(e => (
                        <SelectItem key={String(e["Enterprise ID"])} value={String(e["Enterprise ID"])}>
                          {String(e["Enterprise Name"])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plant</label>
                  <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {filteredPlants.map(p => (
                        <SelectItem key={String(p["Plant ID"])} value={String(p["Plant ID"])}>
                          {String(p["Plant Name"])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {filteredDepartments.map(d => (
                        <SelectItem key={String(d["Department ID"])} value={String(d["Department ID"])}>
                          {String(d["Department Name"])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Production Line</label>
                  <Select value={selectedLine} onValueChange={setSelectedLine}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {filteredLines.map(l => (
                        <SelectItem key={String(l["Line ID"])} value={String(l["Line ID"])}>
                          {String(l["Line Name"])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Machine</label>
                  <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {filteredMachines.map(m => (
                        <SelectItem key={String(m["Machine ID"])} value={String(m["Machine ID"])}>
                          {String(m["Machine Name"])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OEE Main Display */}
          {isLoadingOEE ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : oeeMetrics && (
            <div className="space-y-6">
              {/* OEE Score */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Overall Equipment Effectiveness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <div className={`text-6xl font-bold ${getOEEColor(oeeMetrics.oee)}`}>
                        {oeeMetrics.oee}%
                      </div>
                      {oeeStatus && (
                        <div className={`mt-2 flex items-center gap-2 px-3 py-1 rounded-full ${oeeStatus.color}`}>
                          <oeeStatus.icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{oeeStatus.label}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-4 text-center">
                        OEE = Availability × Performance × Quality
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Three Metrics */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Timer className="h-4 w-4 text-blue-500" />
                        Availability
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{oeeMetrics.availability}%</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Runtime: {oeeMetrics.runtime} min
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Downtime: {oeeMetrics.downtime} min
                      </p>
                      <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${oeeMetrics.availability}%` }} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600">{oeeMetrics.performance}%</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Actual: {oeeMetrics.actualQty} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Planned: {oeeMetrics.plannedQty} units
                      </p>
                      <div className="mt-2 h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${oeeMetrics.performance}%` }} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Quality
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">{oeeMetrics.quality}%</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Good: {oeeMetrics.actualQty - oeeMetrics.rejectQty} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reject: {oeeMetrics.rejectQty} units
                      </p>
                      <div className="mt-2 h-2 bg-green-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${oeeMetrics.quality}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* OEE Formula */}
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center justify-center gap-4 text-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{oeeMetrics.availability}%</div>
                      <div className="text-xs text-muted-foreground">Availability</div>
                    </div>
                    <span className="text-2xl text-muted-foreground">×</span>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">{oeeMetrics.performance}%</div>
                      <div className="text-xs text-muted-foreground">Performance</div>
                    </div>
                    <span className="text-2xl text-muted-foreground">×</span>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{oeeMetrics.quality}%</div>
                      <div className="text-xs text-muted-foreground">Quality</div>
                    </div>
                    <span className="text-2xl text-muted-foreground">=</span>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{oeeMetrics.oee}%</div>
                      <div className="text-xs text-muted-foreground">OEE</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Separator className="mb-8" />

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push("/simulator")}>
              <Cpu className="mr-2 h-4 w-4" />
              Manufacturing Simulator
            </Button>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Master Data Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Master Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MASTER_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.name}
                  className="cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => router.push(`/master-data/${card.name}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${card.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-base mt-2">{card.name}</CardTitle>
                    <CardDescription className="text-xs">Click to manage</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
