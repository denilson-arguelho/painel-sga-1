import { useEffect, useState, useCallback } from "react";
import { DEFAULT_CONFIG, type PanelConfig } from "./types";

const STORAGE_KEY = "panel.config.v1";

function load(): PanelConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const listeners = new Set<(c: PanelConfig) => void>();
let current: PanelConfig = load();

export function getConfig(): PanelConfig {
  return current;
}

export function setConfig(patch: Partial<PanelConfig>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore quota errors
  }
  listeners.forEach((l) => l(current));
}

export function resetConfig() {
  current = { ...DEFAULT_CONFIG };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l(current));
}

export function usePanelConfig(): [PanelConfig, (p: Partial<PanelConfig>) => void] {
  const [state, setState] = useState<PanelConfig>(current);
  useEffect(() => {
    const l = (c: PanelConfig) => setState(c);
    listeners.add(l);
    // Sync nas mudanças entre abas.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        current = load();
        setState(current);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const update = useCallback((p: Partial<PanelConfig>) => setConfig(p), []);
  return [state, update];
}
