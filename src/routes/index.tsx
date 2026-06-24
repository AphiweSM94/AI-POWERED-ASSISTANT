import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Mail, ClipboardList, ListTodo, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import logo from "@/assets/logo.png";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Momentum — AI Workplace Productivity Assistant" },
      {
        name: "description",
        content:
          "Momentum drafts emails, summarizes meetings, plans tasks, and researches topics — an AI assistant for professionals, with a tone you control.",
      },
      { property: "og:title", content: "Momentum — AI Workplace Productivity Assistant" },
      {
        property: "og:description",
        content: "Draft emails, summarize meetings, plan your day, and research faster.",
      },
      { property: "og:image", content: hero },
      { name: "twitter:image", content: hero },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Mail, title: "Smart Email Generator", desc: "Draft polished, on-tone emails for clients, managers, and teams in seconds — with alternative subject lines and short versions." },
  { icon: ClipboardList, title: "Meeting Notes Summarizer", desc: "Turn raw notes into clean summaries, decisions, action items, and follow-up risks." },
  { icon: ListTodo, title: "AI Task Planner", desc: "Get a priority matrix, a recommended schedule, and automation and delegation ideas." },
  { icon: Search, title: "Research Assistant", desc: "Executive summaries, key insights, opportunities, risks, and plain-language explanations." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Momentum logo" width={512} height={512} className="size-8" />
          <span className="font-display text-lg font-semibold">Momentum</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> Responsible AI for professionals
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              Do your best work, <span className="text-primary">faster.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Momentum is an AI workplace assistant that drafts emails, summarizes meetings, plans your
              day, and researches topics — all in one focused workspace, in the tone you choose.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Start for free</Link>
              </Button>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <SlidersHorizontal className="size-4 text-primary" /> Formal · Professional · Friendly · Persuasive
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/5 blur-2xl" />
            <img
              src={hero}
              alt="Momentum assistant drafting emails, summarizing meetings, and planning tasks"
              width={1280}
              height={853}
              className="rounded-2xl border border-border shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Four assistants in one</h2>
            <p className="mt-3 text-muted-foreground">
              Momentum understands what you need and structures every answer for clarity and action.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Ready to build momentum?</h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
            Create a free account and start delegating your busywork to a professional AI assistant.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-7">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={512} height={512} className="size-5" />
            <span>Momentum</span>
          </div>
          <p>AI-generated output. Always verify before acting on important decisions.</p>
        </div>
      </footer>
    </div>
  );
}
