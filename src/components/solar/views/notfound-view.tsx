"use client";

import { useApp } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Sun, Home, ArrowLeft } from "lucide-react";

export function NotFoundView() {
  const { user, navigate } = useApp();
  const isAuthenticated = !!user;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      {/* Subtle hero grid + glow */}
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--solar) 0%, transparent 70%)", opacity: 0.35 }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated sun illustration */}
        <div className="relative mb-2 grid h-32 w-32 place-items-center">
          <div className="solar-spin absolute inset-0">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-12 w-1.5 -translate-x-1/2 -translate-y-1/2 origin-top"
                style={{
                  transform: `rotate(${i * 30}deg) translateY(-46px)`,
                  background: "linear-gradient(to bottom, var(--solar), transparent)",
                  borderRadius: 9999,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--solar)] text-[var(--solar-foreground)] shadow-lg">
            <Sun className="h-10 w-10" />
          </div>
        </div>

        {/* Big 404 */}
        <div className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-8xl font-black tracking-tight text-transparent sm:text-9xl">
          404
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          This page drifted off-grid.
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to the sunshine.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Button onClick={() => navigate("overview")} className="gap-1.5">
              <Home className="h-4 w-4" /> Back to dashboard
            </Button>
          ) : (
            <Button onClick={() => navigate("landing")} className="gap-1.5">
              <Home className="h-4 w-4" /> Back home
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(isAuthenticated ? "assessment" : "auth")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {isAuthenticated ? "Start an assessment" : "Sign in"}
          </Button>
        </div>
      </div>

      <p className="relative z-10 mt-12 text-xs text-muted-foreground">
        SolarAI · Energy Advisor
      </p>
    </div>
  );
}
