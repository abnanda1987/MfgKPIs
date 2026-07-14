"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Factory,
  Building2,
  GitBranch,
  Settings,
  Package,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  ClipboardList,
  Shield,
  CalendarDays,
  MapPin,
  Globe,
  LogOut,
  ChevronRight,
  Cpu,
} from "lucide-react";

const MASTER_CARDS = [
  {
    name: "Enterprise",
    description: "Enterprise reference data",
    icon: Globe,
    color: "bg-blue-50 text-blue-600",
  },
  {
    name: "Country",
    description: "Country reference data",
    icon: MapPin,
    color: "bg-green-50 text-green-600",
  },
  {
    name: "City",
    description: "City reference data",
    icon: Building2,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "Plant",
    description: "Manufacturing plants",
    icon: Factory,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    name: "Department",
    description: "Departments by plant",
    icon: Building2,
    color: "bg-violet-50 text-violet-600",
  },
  {
    name: "ProductionLine",
    description: "Production lines",
    icon: GitBranch,
    color: "bg-purple-50 text-purple-600",
  },
  {
    name: "Machine",
    description: "Machine master data",
    icon: Cpu,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    name: "Product_SKU",
    description: "Product SKUs",
    icon: Package,
    color: "bg-amber-50 text-amber-600",
  },
  {
    name: "User",
    description: "User management",
    icon: Users,
    color: "bg-rose-50 text-rose-600",
  },
  {
    name: "Problem",
    description: "Problem definitions",
    icon: AlertTriangle,
    color: "bg-red-50 text-red-600",
  },
  {
    name: "Role",
    description: "User roles",
    icon: Shield,
    color: "bg-slate-50 text-slate-600",
  },
  {
    name: "Shift",
    description: "Shift definitions",
    icon: Clock,
    color: "bg-orange-50 text-orange-600",
  },
  {
    name: "KPI",
    description: "KPI definitions",
    icon: BarChart3,
    color: "bg-teal-50 text-teal-600",
  },
  {
    name: "AlertThreshold",
    description: "Alert thresholds",
    icon: AlertTriangle,
    color: "bg-pink-50 text-pink-600",
  },
  {
    name: "ProblemCategory",
    description: "Problem categories",
    icon: ClipboardList,
    color: "bg-lime-50 text-lime-600",
  },
  {
    name: "Severity",
    description: "Severity levels",
    icon: Shield,
    color: "bg-fuchsia-50 text-fuchsia-600",
  },
  {
    name: "Status",
    description: "Status values",
    icon: Settings,
    color: "bg-gray-50 text-gray-600",
  },
  {
    name: "Calendar",
    description: "Calendar reference",
    icon: CalendarDays,
    color: "bg-sky-50 text-sky-600",
  },
];

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Factory className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Manufacturing KPI</h1>
                <p className="text-xs text-muted-foreground">Phase 1</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
              <Badge variant="secondary">{user.plantId}</Badge>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <p className="text-sm text-muted-foreground mb-6">
            Click any card to view, search, add, edit, or delete records.
          </p>
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
                    <CardDescription className="text-xs">
                      {card.description}
                    </CardDescription>
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
