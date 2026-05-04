/**
 * Hook central: orquestra config, polling SGA / demo, fila de fala e tema.
 */
import { useEffect, useRef, useState } from "react";
import { usePanelConfig } from "@/lib/panel/config-store";
import { applyTheme } from "@/lib/panel/theme";
import { startSgaPolling, startDemoTickets, type SgaSnapshot } from "@/lib/panel/sga-client";
import { enqueueAnnouncement, primeVoices } from "@/lib/panel/voice-queue";
import type { Ticket } from "@/lib/panel/types";

export function usePanel() {
  const [config] = usePanelConfig();
  const [snapshot, setSnapshot] = useState<SgaSnapshot>({ current: null, last: [] });
  const [error, setError] = useState<string | null>(null);
  const [callPulseKey, setCallPulseKey] = useState(0);
  const lastIdRef = useRef<string | null>(null);

  // Aplica cores no tema sempre que config muda.
  useEffect(() => {
    applyTheme(config);
  }, [
    config.colorBg,
    config.colorCard,
    config.colorText,
    config.colorHighlight,
    config.colorPriority,
    config,
  ]);

  useEffect(() => {
    primeVoices();
  }, []);

  // Inicia polling real ou modo demo.
  useEffect(() => {
    setError(null);
    const handleCall = (t: Ticket) => {
      if (t.id === lastIdRef.current) return;
      lastIdRef.current = t.id;
      setCallPulseKey((k) => k + 1);
      if (config.speechEnabled) {
        enqueueAnnouncement(t, {
          rate: config.speechRate,
          volume: config.speechVolume,
          withChime: config.chimeEnabled,
        });
      }
    };

    if (config.sgaEnabled && config.sgaUrl) {
      const stop = startSgaPolling({
        url: config.sgaUrl,
        unitId: config.sgaUnitId,
        intervalMs: config.sgaPollInterval,
        username: config.sgaUsername,
        password: config.sgaPassword,
        clientId: config.sgaClientId,
        clientSecret: config.sgaClientSecret,
        serviceIds: config.sgaServices,
        onSnapshot: setSnapshot,
        onCall: handleCall,
        onError: (e) => setError(e.message),
      });
      return stop;
    }

    // Modo demo
    const stop = startDemoTickets(handleCall, setSnapshot);
    return stop;
  }, [
    config.sgaEnabled,
    config.sgaUrl,
    config.sgaUnitId,
    config.sgaPollInterval,
    config.sgaUsername,
    config.sgaPassword,
    config.sgaClientId,
    config.sgaClientSecret,
    config.sgaServices,
    config.chimeEnabled,
    config.speechRate,
    config.speechVolume,
  ]);

  return { config, snapshot, error, callPulseKey };
}
