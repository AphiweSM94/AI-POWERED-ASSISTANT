import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { listThreads, createThread } from "@/lib/threads.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppIndex,
});

function AppIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchThreads = useServerFn(listThreads);
  const newThread = useServerFn(createThread);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const threads = await fetchThreads();
      if (threads.length > 0) {
        navigate({ to: "/app/$threadId", params: { threadId: threads[0].id }, replace: true });
        return;
      }
      const thread = await newThread({ data: { tone: "professional" } });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/app/$threadId", params: { threadId: thread.id }, replace: true });
    })();
  }, [fetchThreads, newThread, navigate, queryClient]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
