import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  listThreads,
  createThread,
  deleteThread,
  renameThread,
  type ThreadRow,
} from "@/lib/threads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, Pencil, Trash2, LogOut, Menu, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.png";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  const fetchThreads = useServerFn(listThreads);
  const newThread = useServerFn(createThread);
  const removeThread = useServerFn(deleteThread);
  const rename = useServerFn(renameThread);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: () => fetchThreads(),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ThreadRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleNew() {
    setCreating(true);
    try {
      const thread = await newThread({ data: { tone: "professional" } });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      onNavigate?.();
      navigate({ to: "/app/$threadId", params: { threadId: thread.id } });
    } catch {
      toast.error("Couldn't start a new conversation.");
    } finally {
      setCreating(false);
    }
  }

  async function commitRename(id: string) {
    const title = editValue.trim();
    setEditingId(null);
    if (!title) return;
    try {
      await rename({ data: { threadId: id, title } });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    } catch {
      toast.error("Couldn't rename conversation.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await removeThread({ data: { threadId: id } });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      if (activeId === id) {
        navigate({ to: "/app" });
      }
    } catch {
      toast.error("Couldn't delete conversation.");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <img src={logo} alt="Momentum" className="size-8" />
        <span className="font-display text-lg font-semibold">Momentum</span>
      </div>

      <div className="px-3">
        <Button onClick={handleNew} disabled={creating} className="w-full justify-start gap-2">
          <Plus className="size-4" /> New conversation
        </Button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          History
        </p>
        {threads.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => {
              const isActive = t.id === activeId;
              return (
                <li
                  key={t.id}
                  className={cn(
                    "group/item flex items-center gap-1 rounded-md px-1",
                    isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                  )}
                >
                  {editingId === t.id ? (
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitRename(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(t.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <>
                      <Link
                        to="/app/$threadId"
                        params={{ threadId: t.id }}
                        onClick={onNavigate}
                        className="flex min-w-0 flex-1 items-center gap-2 py-2 text-sm"
                      >
                        <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{t.title}</span>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover/item:opacity-100 data-[state=open]:opacity-100"
                            aria-label="Conversation options"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingId(t.id);
                              setEditValue(t.title);
                            }}
                          >
                            <Pencil className="mr-2 size-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPendingDelete(t)}
                          >
                            <Trash2 className="mr-2 size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {(user?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon-sm" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes “{pendingDelete?.title}” and all of its messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border md:block">
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b border-border px-3 md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <img src={logo} alt="" className="size-6" />
          <span className="font-display font-semibold">Momentum</span>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
