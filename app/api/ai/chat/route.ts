/**
 * POST /api/ai/chat
 * Body: { assessmentId, question, history? }
 * Loads owned assessment, deserializes input + results + aiRecommendation,
 * calls chatAboutAssessment, persists the conversation to an AIConversation
 * row (upserted per user+assessment). Returns { reply, conversationId }.
 * Rate-limited: 15 req/min per IP.
 */

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { chatAboutAssessment } from "@/lib/ai";
import {
  deserializeAI,
  deserializeResults,
  deserializeMessages,
  serializeMessages,
} from "@/lib/solar/helpers";
import { reconstructAssessmentInput } from "@/lib/solar/mapping";
import {
  handleError,
  jsonError,
  jsonOk,
  parseJsonBody,
  rateLimited,
} from "@/lib/api-response";
import { SOLAR_CONFIG } from "@/lib/solar/config";
import type { ChatMessage } from "@/types/solar";

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const rl = rateLimited(req, SOLAR_CONFIG.RATE_LIMIT.MAX_AI);
    if (rl) return rl;

    const body = await parseJsonBody(req);
    if (!body || typeof body !== "object") {
      return jsonError(400, "Invalid request body.");
    }

    const assessmentId = body.assessmentId;
    const question = body.question;
    const history = Array.isArray(body.history) ? body.history : [];

    if (typeof assessmentId !== "string" || !assessmentId.trim()) {
      return jsonError(400, "assessmentId is required.");
    }
    if (typeof question !== "string" || !question.trim()) {
      return jsonError(400, "question is required.");
    }

    const record = await db.assessment.findUnique({ where: { id: assessmentId } });
    if (!record) return jsonError(404, "Assessment not found.");
    if (record.userId !== user.id && user.role !== "admin") {
      return jsonError(404, "Assessment not found.");
    }

    const input = reconstructAssessmentInput(record);
    const results = deserializeResults(record.calculationResults);
    if (!results) {
      return jsonError(500, "Stored calculation results are missing.");
    }
    const aiRec = deserializeAI(record.aiRecommendation);

    // Normalize provided history to ChatMessage[]
    const cleanHistory: ChatMessage[] = history
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-12)
      .map((m: { role: "user" | "assistant"; content: string; ts?: string }) => ({
        role: m.role,
        content: m.content,
        ts: typeof m.ts === "string" ? m.ts : new Date().toISOString(),
      }));

    const reply = await chatAboutAssessment(
      question,
      cleanHistory,
      input,
      results,
      aiRec,
    );

    const now = new Date().toISOString();

    // Find or create the per-user, per-assessment conversation.
    let conversation = await db.aIConversation.findFirst({
      where: { userId: user.id, assessmentId: record.id },
    });

    const existingMessages = conversation
      ? deserializeMessages(conversation.messages)
      : [];

    const updatedMessages: ChatMessage[] = [
      ...existingMessages,
      { role: "user", content: question, ts: now },
      { role: "assistant", content: reply, ts: now },
    ];

    if (conversation) {
      conversation = await db.aIConversation.update({
        where: { id: conversation.id },
        data: {
          messages: serializeMessages(updatedMessages),
          title: `SolarAI Chat - ${record.city}`,
        },
      });
    } else {
      conversation = await db.aIConversation.create({
        data: {
          userId: user.id,
          assessmentId: record.id,
          messages: serializeMessages(updatedMessages),
          title: `SolarAI Chat - ${record.city}`,
        },
      });
    }

    return jsonOk({ reply, conversationId: conversation.id });
  } catch (err) {
    return handleError(err);
  }
}
