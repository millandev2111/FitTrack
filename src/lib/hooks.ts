"use client";

import { useEffect, useState } from "react";
import { subscribeStatus, type SyncStatus } from "./live/outbox";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({ pending: 0, syncing: false, offline: false, failed: 0 });
  useEffect(() => subscribeStatus(setStatus), []);
  return status;
}

/** Mantiene la pantalla encendida mientras la sesión está abierta (si el navegador lo permite). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) await lock.release();
      } catch {}
    };
    const onVisible = () => document.visibilityState === "visible" && request();
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}

let audio: AudioContext | null = null;

/** Prepara el audio dentro de un toque del usuario (requisito de iOS). */
export function primeAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {}
}

export function beep(times = 3) {
  try {
    if (!audio) return;
    for (let i = 0; i < times; i++) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime + i * 0.22;
      osc.frequency.value = i === times - 1 ? 1175 : 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  } catch {}
  try {
    navigator.vibrate?.([180, 80, 180]);
  } catch {}
}
