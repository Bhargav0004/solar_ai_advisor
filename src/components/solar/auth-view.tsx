"use client";

import { useState } from "react";
import { useApp } from "@/store/app-store";
import { Sun, ArrowLeft, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";

export function AuthView() {
  const { login, register, navigate } = useApp();
  const [tab, setTab] = useState<"login" | "register">("login");

  // login state
  const [liEmail, setLiEmail] = useState("");
  const [liPass, setLiPass] = useState("");
  // register state
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(liEmail.trim(), liPass);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(rName.trim(), rEmail.trim(), rPass);
      toast.success("Account created — welcome to SolarAI!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: "admin" | "user") {
    if (role === "admin") {
      setLiEmail("admin@solarai.com");
      setLiPass("admin123");
    } else {
      setLiEmail("demo@solarai.com");
      setLiPass("demo123");
    }
    setTab("login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="h-16 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate("landing")} className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sun className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">SolarAI</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("landing")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Welcome to SolarAI</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in or create an account to save assessments</p>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="register">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-6">
                  <CardTitle className="text-lg">Sign in to your account</CardTitle>
                  <CardDescription className="mt-1">Enter your credentials below</CardDescription>
                </TabsContent>
                <TabsContent value="register" className="mt-6">
                  <CardTitle className="text-lg">Create a new account</CardTitle>
                  <CardDescription className="mt-1">Start your solar assessment journey</CardDescription>
                </TabsContent>
              </Tabs>
            </CardHeader>
            <CardContent>
              {tab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="li-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="li-email" type="email" required value={liEmail} onChange={(e) => setLiEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="li-pass">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="li-pass" type="password" required value={liPass} onChange={(e) => setLiPass(e.target.value)} placeholder="••••••••" className="pl-9" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-name">Full name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="r-name" required value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Jane Doe" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="r-email" type="email" required value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-pass">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="r-pass" type="password" required minLength={6} value={rPass} onChange={(e) => setRPass(e.target.value)} placeholder="Min 6 characters" className="pl-9" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
              )}

              <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Try a demo account:</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fillDemo("user")}>
                    Demo user
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fillDemo("admin")}>
                    Demo admin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree that estimates are informational only.
          </p>
        </div>
      </main>
    </div>
  );
}
