/**
 * Cliente Novo SGA v2.1+ via OAuth2 (password grant) + polling REST.
 *
 * Fluxo:
 *  1. POST {url}/api/oauth/v2/token com grant_type=password (client_id/secret + user/pass)
 *  2. GET  {url}/api/v1/unidades/{unitId}/painel  com Bearer token
 *  3. Refresh token automático antes de expirar.
 *
 * Em modo demo (sem URL configurada), gera senhas simuladas para teste.
 */
import type { Ticket } from "./types";

export type SgaServico = { sigla: string; nome: string };

export type SgaSnapshot = {
  current: Ticket | null;
  last: Ticket[];
  unidade?: string;
  servicos?: SgaServico[];
};

type SgaOptions = {
  url: string;
  unitId: string;
  intervalMs: number;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  onSnapshot: (snap: SgaSnapshot) => void;
  onCall: (ticket: Ticket) => void;
  onError?: (err: Error) => void;
};

function normalize(raw: any, idx = 0): Ticket | null {
  if (!raw) return null;
  // Novo SGA v2.1+: senha vem em raw.senha = { sigla, numero }, local em raw.local, etc.
  const senha = raw.senha ?? raw;
  const prefix =
    senha.sigla ?? raw.sigla ?? raw.prefix ?? raw.servicoSigla ?? raw.servico_sigla ?? "";
  const numeroRaw = senha.numero ?? raw.numero ?? raw.number ?? "";
  const number = String(numeroRaw).padStart(3, "0");
  const place =
    raw.local?.nome ?? raw.local ?? raw.guiche ?? raw.mesa ?? raw.place ?? "Atendimento";
  const service = raw.servico?.nome ?? raw.servico ?? raw.service ?? "";
  const priorityRaw = raw.prioridade?.nome ?? raw.prioridade ?? raw.priority ?? "";
  const peso = raw.prioridade?.peso ?? raw.peso ?? 0;
  const priority: Ticket["priority"] =
    String(priorityRaw).toLowerCase().includes("prior") || peso > 0
      ? "prioridade"
      : "normal";
  if (!prefix && !numeroRaw) return null;
  const calledAt = raw.dataChamada ?? raw.calledAt ?? new Date().toISOString();
  const id = `${prefix}${number}-${calledAt}-${idx}`;
  return {
    id,
    prefix: String(prefix),
    number,
    label: `${prefix}${number}`,
    place: String(place),
    service: String(service),
    priority,
    calledAt,
  };
}

function parseUnidadeServicos(data: any): { unidade?: string; servicos?: SgaServico[] } {
  const payload = data?.data ?? data;
  const unidade =
    payload?.unidade?.nome ?? payload?.nomeUnidade ?? payload?.unidadeNome ?? undefined;
  let servicosRaw: any[] | undefined;
  if (Array.isArray(payload?.servicos)) servicosRaw = payload.servicos;
  else if (Array.isArray(payload?.unidade?.servicos)) servicosRaw = payload.unidade.servicos;
  const servicos = servicosRaw
    ?.map((s: any) => ({
      sigla: String(s.sigla ?? s.servico?.sigla ?? "").trim(),
      nome: String(s.nome ?? s.servico?.nome ?? "").trim(),
    }))
    .filter((s) => s.sigla || s.nome);
  return { unidade, servicos };
}

function parsePayload(data: any): SgaSnapshot {
  // Novo SGA v2.1+: { data: { senhasChamadas: [...] } } ou { senhasChamadas: [...] }
  const payload = data?.data ?? data;
  const meta = parseUnidadeServicos(data);
  const wrap = (snap: SgaSnapshot): SgaSnapshot => ({ ...snap, ...meta });
  if (Array.isArray(payload?.senhasChamadas)) {
    const tickets = payload.senhasChamadas
      .map((r: any, i: number) => normalize(r, i))
      .filter(Boolean) as Ticket[];
    return wrap({ current: tickets[0] ?? null, last: tickets.slice(1) });
  }
  if (payload?.atual !== undefined || payload?.ultimas !== undefined) {
    const current = normalize(payload.atual);
    const last = (payload.ultimas ?? [])
      .map((r: any, i: number) => normalize(r, i))
      .filter(Boolean) as Ticket[];
    return wrap({ current, last });
  }
  if (Array.isArray(payload?.tickets)) {
    const tickets = payload.tickets.map((r: any, i: number) => normalize(r, i)).filter(Boolean) as Ticket[];
    return wrap({ current: tickets[0] ?? null, last: tickets.slice(1) });
  }
  if (Array.isArray(payload)) {
    const tickets = payload.map((r: any, i: number) => normalize(r, i)).filter(Boolean) as Ticket[];
    return wrap({ current: tickets[0] ?? null, last: tickets.slice(1) });
  }
  return wrap({ current: null, last: [] });
}

type TokenInfo = { access_token: string; expires_at: number };

function checkMixedContent(targetUrl: string): void {
  if (typeof window === "undefined") return;
  const pageHttps = window.location.protocol === "https:";
  const targetHttp = targetUrl.toLowerCase().startsWith("http://");
  if (pageHttps && targetHttp) {
    throw new Error(
      "Mixed Content bloqueado: o painel está em HTTPS mas o SGA está em HTTP. " +
      "Solução: rode o painel na mesma rede via HTTP (npm run preview) ou exponha o SGA via HTTPS."
    );
  }
}

function isPrivateIp(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost$)/.test(host);
  } catch {
    return false;
  }
}

async function fetchToken(opts: SgaOptions): Promise<TokenInfo> {
  const base = opts.url.replace(/\/$/, "");
  checkMixedContent(base);
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: opts.clientId ?? "",
    client_secret: opts.clientSecret ?? "",
    username: opts.username ?? "",
    password: opts.password ?? "",
  });
  let res: Response;
  try {
    res = await fetch(`${base}/api/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
  } catch (e) {
    if (isPrivateIp(base)) {
      throw new Error(
        `Servidor inacessível (${base}). É um IP de rede local — o painel precisa rodar na mesma rede do SGA. ` +
        `Faça build e abra via "npm run preview" no PC dentro da rede.`
      );
    }
    throw new Error(`Falha de rede ao conectar em ${base}: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OAuth ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("Resposta OAuth sem access_token");
  const ttl = Number(data.expires_in ?? 3600) * 1000;
  return { access_token: data.access_token, expires_at: Date.now() + ttl - 30_000 };
}

export function startSgaPolling(opts: SgaOptions): () => void {
  let stopped = false;
  let timer: number | undefined;
  let lastCurrentId: string | null = null;
  let token: TokenInfo | null = null;

  const useAuth = !!(opts.clientId && opts.clientSecret && opts.username && opts.password);

  async function ensureToken(): Promise<string | null> {
    if (!useAuth) return null;
    if (!token || Date.now() >= token.expires_at) {
      token = await fetchToken(opts);
    }
    return token.access_token;
  }

  async function tick() {
    if (stopped) return;
    try {
      const access = await ensureToken();
      const base = opts.url.replace(/\/$/, "");
      // Novo SGA v2.1+: /api/v1/unidades/{id}/painel; fallback compat: /api/v1/painel/{id}
      const endpoint = useAuth
        ? `${base}/api/v1/unidades/${encodeURIComponent(opts.unitId)}/painel`
        : `${base}/api/v1/painel/${encodeURIComponent(opts.unitId)}`;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (access) headers.Authorization = `Bearer ${access}`;
      const res = await fetch(endpoint, { headers });
      if (res.status === 401 && useAuth) {
        token = null; // força refresh no próximo tick
        throw new Error("SGA 401 — token inválido, renovando...");
      }
      if (!res.ok) throw new Error(`SGA HTTP ${res.status}`);
      const data = await res.json();
      const snap = parsePayload(data);
      opts.onSnapshot(snap);
      if (snap.current && snap.current.id !== lastCurrentId) {
        lastCurrentId = snap.current.id;
        opts.onCall(snap.current);
      }
    } catch (err) {
      opts.onError?.(err as Error);
    } finally {
      if (!stopped) timer = window.setTimeout(tick, opts.intervalMs);
    }
  }

  tick();
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
  };
}

/** Gerador de senhas simuladas para modo demo. */
export function startDemoTickets(onCall: (t: Ticket) => void, onSnapshot: (s: SgaSnapshot) => void): () => void {
  const prefixes = ["RA", "RAX", "RET"];
  const places = ["Guichê 1", "Guichê 2", "Sala 1", "Sala 2"];
  const history: Ticket[] = [];
  let n = 1;
  let timer: number;

  function emit() {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = String(n++).padStart(3, "0");
    const priority: Ticket["priority"] = Math.random() > 0.75 ? "prioridade" : "normal";
    const t: Ticket = {
      id: `${prefix}${number}-${Date.now()}`,
      prefix,
      number,
      label: `${prefix}${number}`,
      place: places[Math.floor(Math.random() * places.length)],
      service: "Atendimento",
      priority,
      calledAt: new Date().toISOString(),
    };
    history.unshift(t);
    if (history.length > 6) history.pop();
    onCall(t);
    onSnapshot({ current: t, last: history.slice(1) });
    timer = window.setTimeout(emit, 8000 + Math.random() * 6000);
  }

  timer = window.setTimeout(emit, 1500);
  return () => window.clearTimeout(timer);
}
