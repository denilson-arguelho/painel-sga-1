import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, Save, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePanelConfig, resetConfig } from "@/lib/panel/config-store";
import { usePanel } from "@/hooks/use-panel";
import { hexToHslString, hslStringToHex } from "@/lib/panel/theme";
import { enqueueAnnouncement, unlockAudio } from "@/lib/panel/voice-queue";
import { toast } from "@/hooks/use-toast";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hsl: string) => void;
}) {
  const hex = (() => {
    try {
      return hslStringToHex(value);
    } catch {
      return "#000000";
    }
  })();
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexToHslString(e.target.value))}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
        />
        <code className="text-xs text-muted-foreground font-mono">{hex}</code>
      </div>
    </div>
  );
}

const Config = () => {
  const [config, update] = usePanelConfig();
  const { snapshot, error: sgaError } = usePanel();
  const [tab, setTab] = useState<"interface" | "media" | "sga" | "som">("interface");

  useEffect(() => {
    document.title = "Configurações — Painel de Senhas";
  }, []);

  const testVoice = () => {
    unlockAudio();
    enqueueAnnouncement(
      {
        id: "test",
        prefix: "RA",
        number: "001",
        label: "RA001",
        place: "Guichê 1",
        service: "Teste",
        priority: "normal",
        calledAt: new Date().toISOString(),
      },
      {
        rate: config.speechRate,
        volume: config.speechVolume,
        withChime: config.chimeEnabled,
      }
    );
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">Configurações do Painel</h1>
              <p className="text-xs text-muted-foreground">
                Mudanças são salvas automaticamente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetConfig();
                toast({ title: "Configurações restauradas." });
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar padrão
            </Button>
            <Button
              size="sm"
              onClick={() =>
                toast({
                  title: "Configurações salvas",
                  description: "Todas as alterações foram aplicadas.",
                })
              }
            >
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <div className="container grid gap-6 py-8 lg:grid-cols-[200px_1fr]">
        <nav className="flex flex-col gap-1">
          {([
            ["interface", "Interface"],
            ["media", "Mídia & Conteúdo"],
            ["sga", "Servidor SGA"],
            ["som", "Som & Voz"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {tab === "interface" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Layout</CardTitle>
                  <CardDescription>
                    Defina a organização do vídeo e da área de senhas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label>Modo de exibição</Label>
                  <Select
                    value={config.layout}
                    onValueChange={(v) => update({ layout: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">
                        Horizontal — Vídeo à esquerda, senhas à direita
                      </SelectItem>
                      <SelectItem value="vertical">
                        Vertical — Vídeo no topo, senhas embaixo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cores</CardTitle>
                  <CardDescription>
                    Personalize a paleta. Mudanças aparecem em tempo real.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ColorField
                    label="Fundo"
                    value={config.colorBg}
                    onChange={(v) => update({ colorBg: v })}
                  />
                  <ColorField
                    label="Cards"
                    value={config.colorCard}
                    onChange={(v) => update({ colorCard: v })}
                  />
                  <ColorField
                    label="Texto"
                    value={config.colorText}
                    onChange={(v) => update({ colorText: v })}
                  />
                  <ColorField
                    label="Destaque (senha normal)"
                    value={config.colorHighlight}
                    onChange={(v) => update({ colorHighlight: v })}
                  />
                  <ColorField
                    label="Prioridade"
                    value={config.colorPriority}
                    onChange={(v) => update({ colorPriority: v })}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === "media" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Identidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título da unidade</Label>
                    <Input
                      id="title"
                      value={config.title}
                      onChange={(e) => update({ title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle">Subtítulo</Label>
                    <Input
                      id="subtitle"
                      value={config.subtitle}
                      onChange={(e) => update({ subtitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticker">Letreiro digital (rodapé)</Label>
                    <Textarea
                      id="ticker"
                      rows={3}
                      value={config.ticker}
                      onChange={(e) => update({ ticker: e.target.value })}
                      placeholder="Mensagens que vão rolar no rodapé do painel."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vídeo (YouTube)</CardTitle>
                  <CardDescription>
                    Cole a URL ou ID do vídeo. Autoplay e loop são automáticos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="yt">URL do YouTube</Label>
                    <Input
                      id="yt"
                      value={config.youtubeUrl}
                      onChange={(e) => update({ youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Volume do vídeo: {config.videoVolume}%{" "}
                      {config.videoVolume === 0 && (
                        <span className="text-xs text-muted-foreground">(mudo — necessário para autoplay)</span>
                      )}
                    </Label>
                    <Slider
                      value={[config.videoVolume]}
                      max={100}
                      step={1}
                      onValueChange={([v]) => update({ videoVolume: v })}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === "sga" && (
            <Card>
              <CardHeader>
                <CardTitle>Conexão Novo SGA (v2.1+)</CardTitle>
                <CardDescription>
                  Quando desativado, o painel roda em modo demo com senhas simuladas.
                  Autenticação via OAuth2 (password grant).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sga-enabled">Ativar conexão com servidor</Label>
                  <Switch
                    id="sga-enabled"
                    checked={config.sgaEnabled}
                    onCheckedChange={(v) => update({ sgaEnabled: v })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sga-url">URL do servidor</Label>
                  <Input
                    id="sga-url"
                    value={config.sgaUrl}
                    onChange={(e) => update({ sgaUrl: e.target.value })}
                    placeholder="http://172.16.138.64"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sga-user">Usuário</Label>
                    <Input
                      id="sga-user"
                      value={config.sgaUsername}
                      onChange={(e) => update({ sgaUsername: e.target.value })}
                      placeholder="admin"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sga-pass">Senha</Label>
                    <Input
                      id="sga-pass"
                      type="password"
                      value={config.sgaPassword}
                      onChange={(e) => update({ sgaPassword: e.target.value })}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sga-cid">Client ID</Label>
                    <Input
                      id="sga-cid"
                      value={config.sgaClientId}
                      onChange={(e) => update({ sgaClientId: e.target.value })}
                      placeholder="a2c94123d05fd01f3690b31f83bd59fe"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sga-csecret">Client Secret</Label>
                    <Input
                      id="sga-csecret"
                      type="password"
                      value={config.sgaClientSecret}
                      onChange={(e) => update({ sgaClientSecret: e.target.value })}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sga-unit">ID da unidade</Label>
                    <Input
                      id="sga-unit"
                      value={config.sgaUnitId}
                      onChange={(e) => update({ sgaUnitId: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sga-int">Intervalo (ms)</Label>
                    <Input
                      id="sga-int"
                      type="number"
                      min={1000}
                      step={500}
                      value={config.sgaPollInterval}
                      onChange={(e) =>
                        update({ sgaPollInterval: Math.max(1000, Number(e.target.value) || 3000) })
                      }
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Token: <code className="font-mono">{config.sgaUrl || "<URL>"}/api/oauth/v2/token</code>
                  <br />
                  Painel: <code className="font-mono">{config.sgaUrl || "<URL>"}/api/v1/unidades/{config.sgaUnitId}/painel</code>
                </p>

                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                  <strong>CORS:</strong> o servidor SGA precisa permitir requisições do
                  domínio deste painel. Se você ver erros de rede, configure{" "}
                  <code className="font-mono">Access-Control-Allow-Origin</code> no servidor.
                  Para servidores HTTP locais (ex.: <code>http://172.16.x.x</code>), o navegador pode bloquear
                  o acesso a partir de páginas HTTPS.
                </div>
              </CardContent>
            </Card>
          )}

          {tab === "som" && (
            <Card>
              <CardHeader>
                <CardTitle>Som & Vocalização</CardTitle>
                <CardDescription>
                  Alerta sonoro antes da fala e chamadas em fila para evitar sobreposição.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="chime">Alerta sonoro (chime)</Label>
                  <Switch
                    id="chime"
                    checked={config.chimeEnabled}
                    onCheckedChange={(v) => update({ chimeEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="speech">Vocalizar senha</Label>
                  <Switch
                    id="speech"
                    checked={config.speechEnabled}
                    onCheckedChange={(v) => update({ speechEnabled: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Velocidade da fala: {config.speechRate.toFixed(2)}x</Label>
                  <Slider
                    value={[config.speechRate * 100]}
                    min={50}
                    max={150}
                    step={5}
                    onValueChange={([v]) => update({ speechRate: v / 100 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume da voz: {Math.round(config.speechVolume * 100)}%</Label>
                  <Slider
                    value={[config.speechVolume * 100]}
                    max={100}
                    step={5}
                    onValueChange={([v]) => update({ speechVolume: v / 100 })}
                  />
                </div>
                <Button onClick={testVoice} variant="secondary">
                  <Volume2 className="h-4 w-4 mr-2" />
                  Testar chamada
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
};

export default Config;
