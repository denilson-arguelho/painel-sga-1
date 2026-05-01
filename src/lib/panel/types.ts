export type Ticket = {
  /** Identificador único da chamada (id da senha + timestamp). */
  id: string;
  /** Sigla do serviço (ex: "RA"). */
  prefix: string;
  /** Número da senha (ex: "003"). */
  number: string;
  /** Senha formatada para exibição (ex: "RA003"). */
  label: string;
  /** Local de atendimento (ex: "Guichê 1", "Sala 2"). */
  place: string;
  /** Nome do serviço/triagem. */
  service: string;
  /** Prioridade (normal | prioridade). */
  priority: "normal" | "prioridade";
  /** Timestamp ISO de quando foi chamada. */
  calledAt: string;
};

export type LayoutMode = "horizontal" | "vertical";

export type PanelConfig = {
  /** Título exibido no cabeçalho. */
  title: string;
  /** Subtítulo / unidade. */
  subtitle: string;
  /** Texto rotativo do rodapé. */
  ticker: string;
  /** Layout do painel. */
  layout: LayoutMode;

  /** Cores HSL (formato "H S% L%"). */
  colorBg: string;
  colorCard: string;
  colorText: string;
  colorHighlight: string;
  colorPriority: string;

  /** URL do vídeo do YouTube (ID, watch?v=, ou youtu.be). */
  youtubeUrl: string;
  /** Volume do vídeo (0–100). */
  videoVolume: number;

  /** Configurações SGA. */
  sgaUrl: string;
  sgaUnitId: string;
  sgaPollInterval: number; // ms
  sgaEnabled: boolean;

  /** Áudio. */
  speechEnabled: boolean;
  chimeEnabled: boolean;
  speechRate: number;
  speechVolume: number;
};

export const DEFAULT_CONFIG: PanelConfig = {
  title: "MS Diagnósticos",
  subtitle: "Painel de Atendimento",
  ticker:
    "Bem-vindo! Aguarde sua senha ser chamada. • Em caso de dúvida, procure a recepção. • Mantenha o ambiente silencioso.",
  layout: "horizontal",
  colorBg: "210 40% 98%",
  colorCard: "0 0% 100%",
  colorText: "215 35% 15%",
  colorHighlight: "211 100% 42%",
  colorPriority: "0 84% 55%",
  youtubeUrl: "",
  videoVolume: 0,
  sgaUrl: "",
  sgaUnitId: "1",
  sgaPollInterval: 3000,
  sgaEnabled: false,
  speechEnabled: true,
  chimeEnabled: true,
  speechRate: 0.95,
  speechVolume: 1,
};
