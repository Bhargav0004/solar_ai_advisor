"use client";

import { useEffect } from "react";
import { useApp } from "@/store/app-store";
import { LandingView } from "@/components/solar/landing-view";
import { AuthView } from "@/components/solar/auth-view";
import { DashboardShell } from "@/components/solar/dashboard-shell";
import { OverviewView } from "@/components/solar/views/overview-view";
import { AssessmentView } from "@/components/solar/views/assessment-view";
import { ResultsView } from "@/components/solar/views/results-view";
import { AdvisorView } from "@/components/solar/views/advisor-view";
import { SimulatorView } from "@/components/solar/views/simulator-view";
import { HistoryView } from "@/components/solar/views/history-view";
import { ProfileView } from "@/components/solar/views/profile-view";
import { AdminView } from "@/components/solar/views/admin-view";
import { NotFoundView } from "@/components/solar/views/notfound-view";
import { Loader2 } from "lucide-react";
import {PlansView} from "@/components/solar/views/plans-view"  // ← ADD THIS LINE

export default function Home() {
  const { user, view, authChecked, refreshUser, navigate } = useApp();

  // Check auth status on mount
  useEffect(() => {
    if (!authChecked) refreshUser();
  }, [authChecked, refreshUser]);

  // Guard: if not authenticated and viewing a protected view, send to auth
  useEffect(() => {
    if (authChecked && !user && view !== "landing" && view !== "auth" && view !== "notfound") {
      navigate("auth");
    }
  }, [authChecked, user, view, navigate]);

  // Initial loading splash
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading SolarAI…</p>
        </div>
      </div>
    );
  }

  // Public views
  if (view === "landing" || (!user && view === "landing")) {
    return <LandingView />;
  }
  if (view === "auth" || (!user && (view !== "landing" && view !== "notfound"))) {
    return <AuthView />;
  }

  // Not authenticated → auth
  if (!user) {
    return <AuthView />;
  }

  // Authenticated → dashboard shell with active view
  const renderView = () => {
    switch (view) {
      case "overview":
        return <OverviewView />;
      case "assessment":
        return <AssessmentView />;
      case "results":
        return <ResultsView />;
      case "advisor":
        return <AdvisorView />;
      case "simulator":
        return <SimulatorView />;
      case "history":
        return <HistoryView />;
      case "profile":
        return <ProfileView />;
      case "plans":                          // ← ADD THESE 2 LINES
        return <PlansView />;    
      case "admin":
        return user.role === "admin" ? <AdminView /> : <NotFoundView />;
      case "notfound":
        return <NotFoundView />;
      default:
        return <OverviewView />;
    }
  };

  return <DashboardShell>{renderView()}</DashboardShell>;
}
