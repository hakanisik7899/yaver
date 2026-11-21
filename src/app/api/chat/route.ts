import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { runAgentTurn, type AgentEvent } from "@/lib/agent/run";
import { GoogleNotConnectedError } from "@/lib/google/oauth";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const Body = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(4000),
});

/** Turkish message for the chat UI; full details stay in the server log. */
function userFacingError(err: unknown): string {
  if (err instanceof GoogleNotConnectedError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) {
    return "Yapay zekâ servisine bağlanılamadı: API anahtarı geçersiz.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "Yapay zekâ servisi bu isteğe izin vermedi (hesap yetkilerini kontrol et).";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Yapay zekâ servisi şu an yoğun. Birkaç saniye sonra tekrar dene.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    // Also covers an empty credit balance on the Anthropic account.
    return "Yapay zekâ servisi isteği kabul etmedi. Anthropic hesabındaki kredi ve faturalama ayarlarını kontrol et.";
  }
  if (err instanceof Anthropic.APIError) {
    return "Yapay zekâ servisinde geçici bir sorun var. Lütfen tekrar dene.";
  }
  return "Bir sorun oluştu, yanıt tamamlanamadı. Lütfen tekrar dene.";
}

export type ChatStreamEvent = AgentEvent | { type: "start"; conversationId: string } | { type: "done" };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const { message } = parsed.data;

  // Resolve or create the conversation (RLS guarantees ownership).
  let conversationId = parsed.data.conversationId;
  let history: Anthropic.Beta.BetaMessageParam[] = [];
  if (conversationId) {
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return Response.json({ error: "not_found" }, { status: 404 });

    const { data: rows, error } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("id");
    if (error) return Response.json({ error: "load_failed" }, { status: 500 });
    history = rows as Anthropic.Beta.BetaMessageParam[];
  } else {
    const { data: conv, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: userId, title: message.slice(0, 80) })
      .select("id")
      .single();
    if (error) return Response.json({ error: "create_failed" }, { status: 500 });
    conversationId = conv.id as string;
  }
  const convId = conversationId;

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ChatStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      send({ type: "start", conversationId: convId });

      try {
        const added = await runAgentTurn({
          userId,
          conversationId: convId,
          history,
          userText: message,
          onEvent: send,
        });

        // Persist only complete turns so stored history always replays.
        const admin = createAdminClient();
        const { error } = await admin.from("ai_messages").insert(
          added.map((m) => ({
            conversation_id: convId,
            user_id: userId,
            role: m.role,
            content: m.content,
          })),
        );
        if (error) throw error;
        await admin
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);

        send({ type: "done" });
      } catch (err) {
        console.error("chat turn failed", err);
        send({ type: "error", message: userFacingError(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
