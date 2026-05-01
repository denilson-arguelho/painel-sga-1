import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { usePanel } from "@/hooks/use-panel";
import { unlockAudio } from "@/lib/panel/voice-queue";
import { HeaderClock } from "@/components/panel/HeaderClock";
import { MediaPanel } from "@/components/panel/MediaPanel";
import { CurrentCall } from "@/components/panel/CurrentCall";
import { HistoryList } from "@/components/panel/HistoryList";
import { Ticker } from "@/components/panel/Ticker";
import { useEffect } from "react";

const Index = () => {
  const { config, snapshot, error, callPulseKey } = usePanel();

  // SEO
  useEffect(() => {
    document.title = `${config.title} — Painel de Senhas`;
    const desc = `Painel digital de senhas — ${config.subtitle}`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc.slice(0, 155));
  }, [config.title, config.subtitle]);

  // Desbloqueia áudio no primeiro clique/tecla.
  useEffect(() => {
    const handler = () => unlockAudio();
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const isHorizontal = config.layout === "horizontal";

  return (
    <main className="flex h-screen w-screen flex-col panel-bg overflow-hidden">
      <HeaderClock title={config.title} subtitle={config.subtitle} />

      <section
        className={
          isHorizontal
            ? "grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[2fr_1fr]"
            : "grid flex-1 grid-rows-[2fr_1fr] gap-4 p-4"
        }
      >
        <div className="min-h-0">
          <MediaPanel url={config.youtubeUrl} volume={config.videoVolume} />
        </div>
        <div className="min-h-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <CurrentCall ticket={snapshot.current} pulseKey={callPulseKey} />
          </div>
          <HistoryList tickets={snapshot.last} />
        </div>
      </section>

      <Ticker text={config.ticker} />

      {error && (
        <div
          role="alert"
          className="fixed bottom-20 left-4 max-w-sm rounded-lg bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-elevated"
        >
          SGA: {error}
        </div>
      )}

      <Link
        to="/config"
        className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors shadow-card"
        aria-label="Abrir configurações"
      >
        <Settings className="h-4 w-4" />
        Configurações
      </Link>
    </main>
  );
};

export default Index;
