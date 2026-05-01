import type { Ticket } from "@/lib/panel/types";
import { cn } from "@/lib/utils";

type Props = {
  ticket: Ticket | null;
  pulseKey: number;
};

export function CurrentCall({ ticket, pulseKey }: Props) {
  if (!ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border panel-card shadow-card p-8">
        <p className="text-muted-foreground text-lg">Aguardando chamadas…</p>
      </div>
    );
  }

  const priority = ticket.priority === "prioridade";
  return (
    <div
      key={pulseKey}
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-2xl border border-border panel-card shadow-card gradient-current p-6 animate-call-pulse animate-fade-in"
      )}
    >
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Senha chamada</p>
      <p
        className="mt-3 font-display font-black tracking-tight leading-none"
        style={{
          color: priority ? "hsl(var(--panel-priority))" : "hsl(var(--panel-highlight))",
          fontSize: "clamp(4rem, 11vw, 9rem)",
          textShadow: "0 4px 12px hsl(215 30% 18% / 0.18)",
        }}
      >
        {ticket.label}
      </p>
      <div className="mt-4 text-center panel-text">
        <p className="text-3xl font-bold leading-tight">{ticket.place}</p>
        <p
          className={cn(
            "mt-2 inline-block rounded-full px-4 py-1 text-sm font-semibold uppercase tracking-wide",
            priority
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          {priority ? "Prioridade" : "Normal"}
        </p>
      </div>
    </div>
  );
}
