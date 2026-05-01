/** Extrai o ID de vídeo de uma URL do YouTube em vários formatos. */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (i >= 0 && parts[i + 1]) return parts[i + 1];
    }
  } catch {
    return null;
  }
  return null;
}

export function buildYoutubeEmbedUrl(id: string, mute: boolean): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: mute ? "1" : "0",
    controls: "0",
    loop: "1",
    playlist: id,
    modestbranding: "1",
    rel: "0",
    showinfo: "0",
    iv_load_policy: "3",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
