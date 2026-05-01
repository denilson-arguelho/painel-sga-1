import { buildYoutubeEmbedUrl, extractYoutubeId } from "@/lib/panel/youtube";

export function MediaPanel({ url, volume }: { url: string; volume: number }) {
  const id = extractYoutubeId(url);
  const muted = volume === 0;

  if (!id) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground rounded-2xl border border-border">
        <div className="text-center px-6">
          <p className="text-lg font-semibold">Sem mídia configurada</p>
          <p className="text-sm mt-1 opacity-80">
            Acesse <code className="font-mono">/config</code> e adicione uma URL do YouTube.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-card bg-black">
      <iframe
        title="Mídia do painel"
        src={buildYoutubeEmbedUrl(id, muted)}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
