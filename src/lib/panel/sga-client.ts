/**
 * Cliente Novo SGA (compatível com o painel oficial v2.1+).
 *
 * Endpoints (mesmos usados pelo painel oficial Electron):
 *   POST  {server}/api/token                              -> OAuth2 password grant
 *   GET   {server}/api/unidades                           -> lista unidades
 *   GET   {server}/api/unidades/{unityId}/servicos        -> serviços da unidade
 *   GET   {server}/api/unidades/{unityId}/painel?servicos=1,2,3
 *
 * O servidor responde a /painel com array de mensagens no formato:
 *   { id, siglaSenha, numeroSenha, local, numeroLocal, prioridade, ... }
 */
import type { Ticket } from "./types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Todas as requisições ao SGA passam pela Edge Function `sga-proxy`,
 * que roda em HTTPS e faz a chamada server-side ao servidor SGA
 * (mesmo que esteja em HTTP). Isso elimina o erro de Mixed Content
 * e o bloqueio de CORS — exatamente como o painel oficial do Mangati
 * funciona em produção.
 */
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sga-proxy`;
const PROXY_AUTH = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

async function proxyFetch(target: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<Response> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: PROXY_AUTH,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(target),
  });
  return res;
}

export type SgaServico = {
  id: number;
  sigla: string;
  nome: string;
};

export type SgaUnidade = {
  id: number;
  nome: string;
};

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
  /** IDs dos serviços que o painel deve chamar (vazio = todos). */
  serviceIds?: number[];
  onSnapshot: (snap: SgaSnapshot) => void;
  onCall: (ticket: Ticket) => void;
  onError?: (err: Error) => void;
};

function pad(n: any, size: number) {
  const s = "0".repeat(size) + String(n ?? "");
  return s.slice(-size);
}

/**
 * Normaliza uma mensagem do painel oficial Novo SGA.
 * Formato: { id, siglaSenha, numeroSenha, local, numeroLocal, prioridade, peso, ... }
 */
function normalize(raw: any, idx = 0): Ticket | null {
  if (!raw) return null;
  const sigla = raw.siglaSenha ?? raw.senha?.sigla ?? raw.sigla ?? "";
  const numero = raw.numeroSenha ?? raw.senha?.numero ?? raw.numero ?? "";
  if (!sigla && numero === "") return null;
  const number = pad(numero, 3);
  const localNome = raw.local ?? raw.nomeLocal ?? raw.localNome ?? "Atendimento";
  const numLocal = raw.numeroLocal ?? raw.numLocal ?? "";
  const place = numLocal !== "" ? `${localNome} ${pad(numLocal, 2)}` : String(localNome);
  const service = raw.servico ?? raw.nomeServico ?? "";
  const prioridadeNome = String(raw.prioridade ?? raw.nomePrioridade ?? "").toLowerCase();
  const peso = Number(raw.peso ?? raw.pesoPrioridade ?? 0);
  const priority: Ticket["priority"] =
    peso > 0 || prioridadeNome.includes("prior") ? "prioridade" : "normal";
  const calledAt = raw.dataChamada ?? new Date().toISOString();
  const id = `${raw.id ?? `${sigla}${number}`}-${calledAt}-${idx}`;
  return {
    id,
    prefix: String(sigla),
    number,
    label: `${sigla}${number}`,
    place,
    service: String(service),
    priority,
    calledAt,
  };
}

function checkMixedContent(targetUrl: string): void {
  if (typeof window === "undefined") return;
  const pageHttps = window.location.protocol === "https:";
  const targetHttp = targetUrl.toLowerCase().startsWith("http://");
  if (pageHttps && targetHttp) {
    throw new Error(
      "Mixed Content bloqueado: o painel está em HTTPS mas o servidor SGA está em HTTP. " +
        "Solução: rode o painel via HTTP na mesma rede (npm run preview) ou exponha o SGA via HTTPS."
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

function baseOf(url: string) {
  return url.replace(/\/+$/, "");
}

type TokenInfo = { access_token: string; expires_at: number };

/** OAuth2 password grant — endpoint oficial: POST {server}/api/token */
async function fetchToken(opts: {
  url: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<TokenInfo> {
  const base = baseOf(opts.url);
  checkMixedContent(base);
  if (!opts.clientId || !opts.clientSecret) throw new Error("Client ID/Secret obrigatórios");
  if (!opts.username || !opts.password) throw new Error("Usuário/senha obrigatórios");
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    username: opts.username,
    password: opts.password,
  });
  let res: Response;
  try {
    res = await fetch(`${base}/api/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
  } catch (e) {
    if (isPrivateIp(base)) {
      throw new Error(
        `Servidor inacessível (${base}). É um IP de rede local — o painel precisa rodar na mesma rede do SGA. ` +
          `Faça build e abra via "npm run preview" no PC dentro da rede.`
      );
    }
    throw new Error(`Falha de rede ao conectar em ${base}/api/token: ${(e as Error).message}`);
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

async function authedGet(base: string, path: string, token: string) {
  const res = await fetch(`${base}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`SGA ${res.status} em ${path}: ${txt || res.statusText}`);
  }
  return res.json();
}

/* ===== API pública para a tela de Configurações ===== */

export type SgaCredentials = {
  url: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
};

export async function testConnection(c: SgaCredentials) {
  const tok = await fetchToken(c);
  const base = baseOf(c.url);
  const data = await authedGet(base, `/api/unidades`, tok.access_token);
  const unidades: SgaUnidade[] = (Array.isArray(data) ? data : data?.data ?? []).map((u: any) => ({
    id: Number(u.id),
    nome: String(u.nome ?? u.name ?? `Unidade ${u.id}`),
  }));
  return { token: tok.access_token, unidades };
}

export async function fetchServicos(
  c: SgaCredentials,
  unityId: string | number
): Promise<SgaServico[]> {
  const tok = await fetchToken(c);
  const base = baseOf(c.url);
  const data = await authedGet(
    base,
    `/api/unidades/${encodeURIComponent(String(unityId))}/servicos`,
    tok.access_token
  );
  const list = Array.isArray(data) ? data : data?.data ?? [];
  return list
    .map((s: any) => ({
      id: Number(s.servico?.id ?? s.id),
      sigla: String(s.sigla ?? s.servico?.sigla ?? "").trim(),
      nome: String(s.servico?.nome ?? s.nome ?? "").trim(),
    }))
    .filter((s: SgaServico) => s.id > 0);
}

/* ===== Polling em tempo real ===== */

export function startSgaPolling(opts: SgaOptions): () => void {
  let stopped = false;
  let timer: number | undefined;
  let lastCurrentId: string | null = null;
  let token: TokenInfo | null = null;
  let cachedServicos: SgaServico[] | null = null;

  async function ensureToken(): Promise<string> {
    if (!token || Date.now() >= token.expires_at) {
      token = await fetchToken(opts);
    }
    return token.access_token;
  }

  async function loadServicosOnce(access: string, base: string): Promise<SgaServico[]> {
    if (cachedServicos) return cachedServicos;
    try {
      const data = await authedGet(
        base,
        `/api/unidades/${encodeURIComponent(opts.unitId)}/servicos`,
        access
      );
      const list = Array.isArray(data) ? data : data?.data ?? [];
      cachedServicos = list
        .map((s: any) => ({
          id: Number(s.servico?.id ?? s.id),
          sigla: String(s.sigla ?? s.servico?.sigla ?? "").trim(),
          nome: String(s.servico?.nome ?? s.nome ?? "").trim(),
        }))
        .filter((s: SgaServico) => s.id > 0);
      return cachedServicos;
    } catch {
      return [];
    }
  }

  async function tick() {
    if (stopped) return;
    try {
      const access = await ensureToken();
      const base = baseOf(opts.url);
      const servicos = await loadServicosOnce(access, base);
      // Se usuário não filtrou, usa todos os serviços da unidade.
      const ids =
        opts.serviceIds && opts.serviceIds.length > 0
          ? opts.serviceIds
          : servicos.map((s) => s.id);
      const qs = ids.length ? `?servicos=${ids.join(",")}` : "";
      const url = `${base}/api/unidades/${encodeURIComponent(opts.unitId)}/painel${qs}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${access}` },
      });
      if (res.status === 401) {
        token = null;
        throw new Error("SGA 401 — renovando token");
      }
      if (!res.ok) throw new Error(`SGA HTTP ${res.status}`);
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : data?.data ?? [];
      const tickets = list.map((m, i) => normalize(m, i)).filter(Boolean) as Ticket[];
      const snap: SgaSnapshot = {
        current: tickets[0] ?? null,
        last: tickets.slice(1, 6),
        servicos,
      };
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
export function startDemoTickets(
  onCall: (t: Ticket) => void,
  onSnapshot: (s: SgaSnapshot) => void
): () => void {
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
