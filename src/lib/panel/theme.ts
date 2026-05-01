/**
 * Aplica as cores do PanelConfig nas CSS variables do documento.
 * As cores são strings HSL no formato "H S% L%".
 */
import type { PanelConfig } from "./types";

export function applyTheme(cfg: PanelConfig) {
  const root = document.documentElement;
  root.style.setProperty("--panel-bg", cfg.colorBg);
  root.style.setProperty("--panel-card", cfg.colorCard);
  root.style.setProperty("--panel-text", cfg.colorText);
  root.style.setProperty("--panel-highlight", cfg.colorHighlight);
  root.style.setProperty("--panel-priority", cfg.colorPriority);
}

/** Converte "#3366ff" → "H S% L%" (espaço-separado, pronto para hsl(var(--x))). */
export function hexToHslString(hex: string): string {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslStringToHex(hsl: string): string {
  const [hStr, sStr, lStr] = hsl.split(/\s+/);
  const h = parseFloat(hStr);
  const s = parseFloat(sStr) / 100;
  const l = parseFloat(lStr) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
