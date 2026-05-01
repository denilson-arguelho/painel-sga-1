/**
 * Cliente SGA via polling REST.
 *
 * Este módulo busca periodicamente as últimas senhas chamadas e dispara
 * callback quando detecta uma chamada nova. Suporta o formato do Novo SGA
 * (endpoint /api/v1/painel/{unidade}) e degrada graciosamente para um
 * formato genérico { tickets: [...] }.
 *
 * Em modo demo (sem URL configurada), gera senhas simuladas para teste.
 */
import type { Ticket } from "./types";

export type SgaSnapshot = {
  current: Ticket | null;
  last: Ticket[];
};

type SgaOptions = {
  url: string;
  unitId: string;
  intervalMs: number;
  onSnapshot: (snap: SgaSnapshot) => void;
  onCall: (ticket: Ticket) => void;
  onError?: (err: Error) => void;
};

function normalize(raw: any, idx = 0): Ticket | null {
  if (!raw) return null;
  // Novo SGA: { sigla, numero, local, servico, prioridade, ... }
  const prefix =
    raw.sigla ?? raw.prefix ?? raw.servicoSigla ?? raw.servico_sigla ?? "";
  const numeroRaw = raw.numero ?? raw.number ?? raw.senha ?? "";
  const number = String(numeroRaw).padStart(3, "0");
  const place =
    raw.local ?? raw.guiche ?? raw.mesa ?? raw.place ?? "Atendimento";
  const service = raw.servico ?? raw.service ?? raw.nomeServico ?? "";
  const priorityRaw = raw.prioridade ?? raw.priority ?? "";
  const priority: Ticket["priority"] =
    String(priorityRaw).toLowerCase().includes("prior") ||
    raw.prioridadeNome === "Prioridade" ||
    raw.peso > 0
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

function parsePayload(data: any): SgaSnapshot {
  // Forma 1: Novo SGA — { atual: {...}, ultimas: [...] }
  if (data?.atual !== undefined || data?.ultimas !== undefined) {
    const current = normalize(data.atual);
    const last = (data.ultimas ?? []).map((r: any, i: number) => normalize(r, i)).filter(Boolean) as Ticket[];
    return { current, last };
  }
  // Forma 2: { current, last } / { tickets }
  if (Array.isArray(data?.tickets)) {
    const tickets = data.tickets.map((r: any, i: number) => normalize(r, i)).filter(Boolean) as Ticket[];
    return { current: tickets[0] ?? null, last: tickets.slice(1) };
  }
  if (data?.current !== undefined) {
    return {
      current: normalize(data.current),
      last: (data.last ?? []).map((r: any, i: number) => normalize(r, i)).filter(Boolean) as Ticket[],
    };
  }
  // Forma 3: array bruto
  if (Array.isArray(data)) {
    const tickets = data.map((r: any, i: number) => normalize(r, i)).filter(Boolean) as Ticket[];
    return { current: tickets[0] ?? null, last: tickets.slice(1) };
  }
  return { current: null, last: [] };
}

export function startSgaPolling(opts: SgaOptions): () => void {
  let stopped = false;
  let timer: number | undefined;
  let lastCurrentId: string | null = null;

  async function tick() {
    if (stopped) return;
    try {
      const base = opts.url.replace(/\/$/, "");
      const endpoint = `${base}/api/v1/painel/${encodeURIComponent(opts.unitId)}`;
      const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
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
