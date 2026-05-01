import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";

export function HeaderClock({ title, subtitle }: { title: string; subtitle: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(i);
  }, []);
  const date = format(now, "EEEE',' dd/MM/yyyy", { locale: ptBR });
  const time = format(now, "HH:mm:ss");
  return (
    <header className="flex items-center justify-between gap-6 px-8 py-4 gradient-header text-primary-foreground shadow-elevated">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
        <p className="text-sm opacity-90 truncate">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="text-sm opacity-90 capitalize">{date}</p>
        <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">{time}</p>
      </div>
    </header>
  );
}
