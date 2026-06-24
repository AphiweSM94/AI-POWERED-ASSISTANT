import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getThread } from "@/lib/threads.functions";
import { ChatWindow } from "@/components/app/chat-window";
import { isTone, type Tone } from "@/lib/system-prompt";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = useParams({ from: "/_authenticated/app/$threadId" });
  const fetchThread = useServerFn(getThread);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchThread({ data: { threadId } }),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">This conversation couldn't be found.</p>
        <Button asChild variant="outline">
          <Link to="/app">Back to your conversations</Link>
        </Button>
      </div>
    );
  }

  const tone: Tone = isTone(data.thread.tone) ? data.thread.tone : "professional";
  const initialMessages = data.messages as unknown as UIMessage[];

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      initialTone={tone}
    />
  );
}
