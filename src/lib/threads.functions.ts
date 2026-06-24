import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Json;
};

export type ThreadRow = {
  id: string;
  title: string;
  tone: string;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  default_tone: string;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadRow[]> => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id, title, tone, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileRow | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, default_tone")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().max(80).optional(),
        default_tone: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tone: z.string().default("professional") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<ThreadRow> => {
    const { data: row, error } = await context.supabase
      .from("threads")
      .insert({ user_id: context.userId, tone: data.tone })
      .select("id, title, tone, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid() }).parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ thread: ThreadRow; messages: StoredMessage[] } | null> => {
      const { data: thread, error: tErr } = await context.supabase
        .from("threads")
        .select("id, title, tone, created_at, updated_at")
        .eq("id", data.threadId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (tErr) throw new Error(tErr.message);
      if (!thread) return null;

      const { data: rows, error: mErr } = await context.supabase
        .from("messages")
        .select("id, ai_id, role, parts")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: true });
      if (mErr) throw new Error(mErr.message);

      const messages: StoredMessage[] = (rows ?? []).map((r) => ({
        id: (r.ai_id as string) || (r.id as string),
        role: r.role as StoredMessage["role"],
        parts: (r.parts as Json) ?? [],
      }));

      return { thread, messages };
    },
  );

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ threadId: z.string().uuid(), title: z.string().trim().min(1).max(120) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .update({ title: data.title })
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateThreadTone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), tone: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .update({ tone: data.tone })
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .delete()
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
