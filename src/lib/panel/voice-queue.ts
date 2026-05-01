/**
 * Fila de fala + chime.
 * Garante que múltiplas senhas chamadas não se sobreponham no áudio.
 */
import type { Ticket } from "./types";

type SpeakOptions = {
  rate: number;
  volume: number;
  withChime: boolean;
};

const queue: Array<{ ticket: Ticket; opts: SpeakOptions }> = [];
let speaking = false;
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/** Toca um chime suave de dois tons (ding-dong). */
export function playChime(volume = 0.6): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const tones = [
        { freq: 880, start: 0, dur: 0.35 },
        { freq: 660, start: 0.28, dur: 0.5 },
      ];
      tones.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
      window.setTimeout(resolve, 900);
    } catch {
      resolve();
    }
  });
}

function buildPhrase(t: Ticket): string {
  // Pronuncia letra por letra para siglas (ex: "R A 003")
  const spelled = t.prefix.split("").join(" ");
  const num = t.number.replace(/^0+/, "") || "0";
  return `Senha ${spelled} ${num}, ${t.place}.`;
}

function speakNow(text: string, opts: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = opts.rate;
    u.volume = opts.volume;
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (ptVoice) u.voice = ptVoice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

async function drain() {
  if (speaking) return;
  speaking = true;
  while (queue.length) {
    const { ticket, opts } = queue.shift()!;
    if (opts.withChime) {
      await playChime(opts.volume);
    }
    await speakNow(buildPhrase(ticket), opts);
    await new Promise((r) => setTimeout(r, 250));
  }
  speaking = false;
}

export function enqueueAnnouncement(ticket: Ticket, opts: SpeakOptions) {
  queue.push({ ticket, opts });
  drain();
}

/** Pré-carrega vozes (Chrome carrega assíncrono). */
export function primeVoices() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

/** Desbloqueia áudio após interação do usuário (políticas de autoplay). */
export function unlockAudio() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
  } catch {
    // ignore
  }
}
