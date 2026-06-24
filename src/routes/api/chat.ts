import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildSystemPrompt, isTone, type Tone } from "@/lib/system-prompt";

type ChatBody = {
  messages?: UIMessage[];
  threadId?: string;
  tone?: string;
};

function textOf(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        if (!token || token.split(".").length !== 3) {
          return new Response("Unauthorized", { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Backend not configured", { status: 500 });
        }
        if (!LOVABLE_API_KEY) {
          return new Response("AI is not configured", { status: 500 });
        }

        const supabase = createClient<Database>(
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );

        const { data: claimData, error: claimErr } =
          await supabase.auth.getClaims(token);
        const userId = claimData?.claims?.sub as string | undefined;
        if (claimErr || !userId) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as ChatBody;
        const messages = Array.isArray(body.messages) ? body.messages : null;
        const threadId = body.threadId;
        if (!messages || !threadId) {
          return new Response("Messages and threadId are required", {
            status: 400,
          });
        }

        // Verify thread ownership
        const { data: thread, error: threadErr } = await supabase
          .from("threads")
          .select("id, title, tone")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (threadErr || !thread) {
          return new Response("Thread not found", { status: 404 });
        }

        const tone: Tone = isTone(body.tone)
          ? body.tone
          : isTone(thread.tone)
            ? thread.tone
            : "professional";

        // Persist the latest user message
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const { error: insertErr } = await supabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            ai_id: lastUser.id,
            role: "user",
            parts: lastUser.parts as unknown as Database["public"]["Tables"]["messages"]["Insert"]["parts"],
          });
          // 23505 = unique violation (message already saved on a retry) — ignore
          if (insertErr && insertErr.code !== "23505") {
            console.error("Failed to save user message", insertErr);
          }

          // Set a title from the first user message if still default
          if (thread.title === "New conversation") {
            const title = textOf(lastUser).slice(0, 80) || "New conversation";
            await supabase
              .from("threads")
              .update({ title })
              .eq("id", threadId)
              .eq("user_id", userId);
          } else {
            await supabase
              .from("threads")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", threadId)
              .eq("user_id", userId);
          }
        }

        const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: buildSystemPrompt(tone),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const { error } = await supabase.from("messages").insert({
              thread_id: threadId,
              user_id: userId,
              ai_id: responseMessage.id,
              role: responseMessage.role,
              parts:
                responseMessage.parts as unknown as Database["public"]["Tables"]["messages"]["Insert"]["parts"],
            });
            if (error && error.code !== "23505") {
              console.error("Failed to save assistant message", error);
            }
          },
        });
      },
    },
  },
});
