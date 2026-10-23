"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/store/app-store";
import { api, ApiError } from "@/lib/api-client";
import { PageHeader, PageBody } from "@/components/solar/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Send,
  Sparkles,
  ArrowLeft,
  User as UserIcon,
  ClipboardList,
  Zap,
  Clock,
  Leaf,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { AssessmentRecord, ChatMessage } from "@/types/solar";
import { formatNumber } from "@/lib/solar/helpers";

const SUGGESTED_QUESTIONS = [
  "Why is solar suitable for my home?",
  "How many panels do I need?",
  "How much money can I save?",
  "What happens if my electricity consumption increases?",
  "How can I improve my solar efficiency?",
  "Should I install a battery?",
  "What happens if my roof has shading?",
];

export function AdvisorView() {
  const { currentAssessmentId, navigate } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", currentAssessmentId],
    queryFn: () =>
      api
        .get<{ assessment: AssessmentRecord }>(
          `/api/assessment/${currentAssessmentId}`,
        )
        .then((d) => d.assessment),
    enabled: !!currentAssessmentId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading || !currentAssessmentId) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      ts: new Date().toISOString(),
    };

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
      ts: m.ts,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.post<{ reply: string; conversationId: string }>(
        "/api/ai/chat",
        {
          assessmentId: currentAssessmentId,
          question: trimmed,
          history,
        },
      );
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to reach the AI advisor";
      toast.error(msg);
      const errMsg: ChatMessage = {
        role: "assistant",
        content: `Sorry, I couldn't respond right now. ${msg}`,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  }

  if (!currentAssessmentId) {
    return (
      <>
        <PageHeader
          title="AI Energy Advisor"
          description="Ask questions about your solar assessment — answers use your actual data."
        />
        <PageBody>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">No assessment selected</p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Run a solar assessment first, then come back to ask the AI about
                  your results.
                </p>
              </div>
              <Button
                onClick={() => navigate("assessment")}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" /> Start an assessment
              </Button>
            </CardContent>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="AI Energy Advisor"
        description="Ask questions about your solar assessment — answers use your actual data."
        action={
          <Button
            variant="outline"
            onClick={() => navigate("results", currentAssessmentId)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Button>
        }
      />
      <PageBody className="flex flex-col gap-4">
        <ContextCard assessment={assessment} loading={isLoading} />

        <Card className="flex flex-col overflow-hidden p-0">
          <div className="solar-scroll flex max-h-[52vh] min-h-[280px] flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 && !loading ? (
              <EmptyChatState />
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <MessageBubble key={`${i}-${m.ts}`} message={m} />
                  ))}
                  {loading && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TypingIndicator />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2 p-4 sm:px-6">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendQuestion(q)}
                disabled={loading}
                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <Separator />

          <div className="flex items-center gap-2 p-4 sm:px-6">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your solar assessment..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={() => sendQuestion(input)}
              disabled={loading || !input.trim()}
              className="gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </Card>

        <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Estimates are informational. The AI uses only your assessment data
            and cannot invent measurements. Verify with a qualified solar
            professional.
          </span>
        </p>
      </PageBody>
    </>
  );
}

function ContextCard({
  assessment,
  loading,
}: {
  assessment?: AssessmentRecord;
  loading: boolean;
}) {
  if (loading || !assessment) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="hidden gap-4 sm:flex">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </Card>
    );
  }

  const r = assessment.calculationResults;
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold capitalize">
                {assessment.propertyType}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {assessment.city}, {assessment.state}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Asking about this assessment
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          <ContextStat
            icon={Zap}
            label="Capacity"
            value={`${formatNumber(r.recommendedCapacityKW, 1)} kW`}
          />
          <ContextStat
            icon={Zap}
            label="Monthly gen"
            value={`${formatNumber(r.monthlyGenerationKWh)} kWh`}
          />
          <ContextStat
            icon={Leaf}
            label="Suitability"
            value={`${r.suitabilityScore}/100`}
          />
          <ContextStat
            icon={Clock}
            label="Payback"
            value={`${formatNumber(r.paybackYears, 1)} yr`}
          />
        </div>
      </div>
    </Card>
  );
}

function ContextStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function EmptyChatState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
        <Bot className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="font-medium">Ask me anything about your solar setup</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          I have your assessment data ready. Try a suggested question below to
          get started.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar className="h-8 w-8 shrink-0 border border-border">
        <AvatarFallback
          className={
            isUser
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground"
          }
        >
          {isUser ? (
            <UserIcon className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <Avatar className="h-8 w-8 shrink-0 border border-border">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s] [animation-duration:1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s] [animation-duration:1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-duration:1s]" />
        </div>
      </div>
    </div>
  );
}
