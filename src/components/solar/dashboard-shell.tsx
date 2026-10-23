"use client";

import { useState, type ReactNode } from "react";
import { useApp, type AppView } from "@/store/app-store";
import { Sun, LayoutDashboard, ClipboardList, Bot, SlidersHorizontal, History, User as UserIcon, ShieldCheck, LogOut, Menu, Sparkles, ChevronRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  needsAssessment?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "assessment", label: "New Assessment", icon: ClipboardList },
  { view: "results", label: "Results", icon: Sparkles, needsAssessment: true },
  { view: "advisor", label: "AI Advisor", icon: Bot, needsAssessment: true },
  { view: "simulator", label: "What-If Simulator", icon: SlidersHorizontal, needsAssessment: true },
  { view: "plans", label: "Solar Plans", icon: Tag, needsAssessment: true },   // ← ADD THIS LINE
  { view: "history", label: "History", icon: History },
  { view: "profile", label: "Profile", icon: UserIcon },
  { view: "admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

function getInitials(name?: string) {
  return (name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavList({
  view,
  currentAssessmentId,
  user,
  onNavigate,
}: {
  view: AppView;
  currentAssessmentId: string | null;
  user: { role?: string } | null;
  onNavigate?: () => void;
}) {
  const navigate = useApp((s) => s.navigate);
  const items = NAV_ITEMS.filter((i) => {
    if (i.adminOnly && user?.role !== "admin") return false;
    if (i.needsAssessment && !currentAssessmentId) return false;
    return true;
  });
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = view === item.view;
        return (
          <button
            key={item.view}
            onClick={() => {
              navigate(item.view);
              onNavigate?.();
            }}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.needsAssessment && currentAssessmentId && (
              <ChevronRight className={cn("h-3.5 w-3.5", active ? "text-primary-foreground" : "text-muted-foreground/50")} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-5 py-5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Sun className="h-5 w-5" />
      </div>
      <div className="text-left">
        <div className="text-base font-semibold leading-tight">SolarAI</div>
        <div className="text-[10px] text-muted-foreground">Energy Advisor</div>
      </div>
    </button>
  );
}

function UserBlock({ user, onLogout }: { user: { name?: string; email?: string; role?: string } | null; onLogout: () => void }) {
  const initials = getInitials(user?.name);
  return (
    <div className="border-t border-border/60 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Avatar className="h-9 w-9 border border-border">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user?.name}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </div>
        {user?.role === "admin" && <Badge variant="secondary" className="shrink-0 text-[10px]">Admin</Badge>}
      </div>
      <Button variant="ghost" size="sm" className="mt-1 w-full justify-start gap-2 text-muted-foreground" onClick={onLogout}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, view, navigate, logout, currentAssessmentId } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = getInitials(user?.name);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-background lg:flex">
        <Brand onClick={() => navigate("overview")} />
        <div className="flex-1 overflow-y-auto py-3 solar-scroll">
          <NavList view={view} currentAssessmentId={currentAssessmentId} user={user} />
        </div>
        <UserBlock user={user} onLogout={logout} />
      </aside>

      {/* Mobile navigation drawer (overlay, controlled) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <Brand onClick={() => { navigate("overview"); setMobileOpen(false); }} />
            <div className="flex-1 overflow-y-auto py-3 solar-scroll">
              <NavList view={view} currentAssessmentId={currentAssessmentId} user={user} onNavigate={() => setMobileOpen(false)} />
            </div>
            <UserBlock user={user} onLogout={logout} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Single main content area (renders children ONCE) */}
      <div className="flex flex-1 flex-col">
        {/* Mobile-only top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sun className="h-4 w-4" />
            </div>
            <span className="font-semibold">SolarAI</span>
          </div>
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

/** Page header used inside dashboard views */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-6 sm:px-6 sm:py-8 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 py-6 sm:px-6 sm:py-8", className)}>{children}</div>;
}
