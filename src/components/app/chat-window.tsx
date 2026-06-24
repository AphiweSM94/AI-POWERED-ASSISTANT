import { useMemo, useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateThreadTone } from "@/lib/threads.functions";
import { TONES, type Tone } from "@/lib/system-prompt";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, ClipboardList, ListTodo, Search } from "lucide-react";

const SUGGESTIONS = [
  { icon: Mail, label: "Draft an email", prompt: "Help me write a professional email to a client following up on a proposal." },
  { icon: ClipboardList, label: "Summarize notes", prompt: "Summarize these meeting notes into key points, decisions, and action items:\n\n" },
  { icon: ListTodo, label: "Plan my day", prompt: "Here are my tasks for today. Build a priority matrix and a recommended schedule:\n\n" },
  { icon: Search, label: "Research a topic", prompt: "Give me an executive summary, key insights, opportunities, and risks for this topic:\n\n" },
];

export function ChatWindow({
  threadId,
  initialMessages,
  initialTone,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  initialTone: Tone;
}) {
  const queryClient = useQueryClient();
  const setTone = useServerFn(updateThreadTone);
  const [tone, setToneState] = useState<Tone>(initialTone);
  const toneRef = useRef<Tone>(initialTone);
  const [input, setInput] = useState("");

  useEffect(() => {
    toneRef.current = tone;
  }, [tone]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, id }) => {
          const { data } = await supabase.auth.getSession();
          return {
            headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
            body: { messages, threadId: id, tone: toneRef.current },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "Something went wrong. Please try again."),
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);

  const isBusy = status === "submitted" || status === "streaming";

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setInput("");
    await sendMessage({ text: trimmed });
  }

  function handleSubmit(message: PromptInputMessage, e: React.FormEvent) {
    e.preventDefault();
    void send(message.text ?? input);
  }

  async function handleToneChange(value: string) {
    const next = value as Tone;
    setToneState(next);
    try {
      await setTone({ data: { threadId, tone: next } });
    } catch {
      toast.error("Couldn't save tone preference.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="py-16"
              icon={<img src={logo} alt="" className="size-14" />}
              title="How can I help you work smarter?"
              description="Draft emails, summarize meetings, plan tasks, or research a topic."
            >
              <img src={logo} alt="" className="size-14" />
              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold">How can I help you work smarter?</h3>
                <p className="text-sm text-muted-foreground">
                  Draft emails, summarize meetings, plan tasks, or research a topic.
                </p>
              </div>
              <div className="mt-4 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      if (s.prompt.endsWith("\n\n")) {
                        setInput(s.prompt);
                        inputRef.current?.focus();
                      } else {
                        void send(s.prompt);
                      }
                    }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/10"
                  >
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <s.icon className="size-4" />
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent
                  className={cn(
                    message.role === "user" &&
                      "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
                  )}
                >
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      message.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <span key={i} className="whitespace-pre-wrap">{part.text}</span>
                      )
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {error && (
          <p className="mb-2 text-center text-xs text-destructive">
            {error.message || "Request failed. Please try again."}
          </p>
        )}
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Momentum to draft, summarize, plan, or research…"
          />
          <PromptInputFooter>
            <Select value={tone} onValueChange={handleToneChange}>
              <SelectTrigger className="h-8 w-auto gap-1.5 border-none bg-transparent text-xs shadow-none focus:ring-0">
                <span className="text-muted-foreground">Tone:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="font-medium">{t.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{t.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PromptInputSubmit status={status} disabled={!input.trim() && !isBusy} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Momentum is AI-generated. Verify important facts, names, and deadlines before acting.
        </p>
      </div>
    </div>
  );
}
