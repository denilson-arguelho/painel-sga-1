import type { Ticket } from "@/lib/panel/types";
import { cn } from "@/lib/utils";

export function HistoryList({ tickets }: { tickets: Ticket[] }) {
  if (!tickets.length) {
    return (
      <div className="rounded-2xl border border-border panel-card shadow-card p-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">
          Últimas chamadas
        </p>
        <p className="text-muted-foreground text-sm">Nenhum histórico ainda.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border panel-card shadow-card p-4">
      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
        Últimas chamadas
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tickets.slice(0, 8).map((t) => {
          const priority = t.priority === "prioridade";
          return (
            <li
              key={t.id}
              className="rounded-xl border border-border bg-background/60 p-3 text-center"
            >
              <p
                className={cn(
                  "font-display font-extrabold leading-none",
                  priority ? "text-destructive" : "panel-text"
                )}
                style={{ fontSize: "clamp(1.5rem, 2.4vw, 2.25rem)" }}
              >
                {t.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {t.place}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
