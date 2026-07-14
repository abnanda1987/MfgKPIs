"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Loader2 } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    setIsLoading(true);
    const success = await login("aarav.sharma@globalauto.com", "Welcome1");
    if (success) {
      router.push("/dashboard");
    } else {
      // Fallback: manually set user in context if login API fails
      // This bypasses the API entirely for demo purposes
      const user = {
        email: "aarav.sharma@globalauto.com",
        role: "Admin",
        plantId: "PL001",
        firstName: "Aarav",
        lastName: "Sharma",
      };
      localStorage.setItem("mkpi_user", JSON.stringify(user));
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Factory className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Manufacturing KPI
          </CardTitle>
          <CardDescription>
            Phase 1 - Master Data & Simulator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSignIn} 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In as Admin"
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Demo mode — no credentials required
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
