"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Cola de cambios pendientes. Todo lo que pasa durante una sesión se guarda
 * primero en el teléfono y se envía a Supabase cuando hay conexión.
 * Los id los genera el cliente, así que reenviar un cambio es seguro (upsert).
 */

export type Table = "workouts" | "workout_exercises" | "sets" | "activities" | "body_metrics";

type Op =
  | { id: string; kind: "upsert"; table: Table; key: string; row: Record<string, unknown>; tries: number }
  | { id: string; kind: "update"; table: Table; key: string; patch: Record<string, unknown>; tries: number }
  | { id: string; kind: "delete"; table: Table; key: string; tries: number };

type OpInput =
  | { kind: "upsert"; table: Table; row: Record<string, unknown> & { id: string } }
  | { kind: "update"; table: Table; key: string; patch: Record<string, unknown> }
  | { kind: "delete"; table: Table; key: string };

export type SyncStatus = { pending: number; syncing: boolean; offline: boolean; failed: number };
type SyncedEvent = { table: Table; key: string; row?: Record<string, unknown> };

const QUEUE_KEY = "ft-outbox";
const DEAD_KEY = "ft-outbox-failed";
const MAX_TRIES = 5;

let queue: Op[] = [];
let loaded = false;
let flushing = false;
let inflightId: string | null = null;
let offline = false;
let timer: ReturnType<typeof setInterval> | null = null;
const statusListeners = new Set<(s: SyncStatus) => void>();
const syncedListeners = new Set<(e: SyncedEvent) => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    queue = [];
  }
  window.addEventListener("online", () => {
    offline = false;
    void flush();
  });
  window.addEventListener("offline", () => {
    offline = true;
    emit();
  });
  offline = !navigator.onLine;
}

function persist() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

function failedCount() {
  try {
    return (JSON.parse(localStorage.getItem(DEAD_KEY) ?? "[]") as unknown[]).length;
  } catch {
    return 0;
  }
}

function status(): SyncStatus {
  return { pending: queue.length, syncing: flushing, offline, failed: failedCount() };
}

function emit() {
  const s = status();
  statusListeners.forEach((l) => l(s));
}

function ensureTimer() {
  if (timer || typeof window === "undefined") return;
  timer = setInterval(() => {
    if (queue.length > 0) void flush();
  }, 15_000);
}

export function enqueue(input: OpInput) {
  load();
  const key = input.kind === "upsert" ? input.row.id : input.key;
  const same = (op: Op) => op.table === input.table && op.key === key && op.id !== inflightId;

  if (input.kind === "upsert") {
    const existing = queue.find((op) => same(op) && op.kind === "upsert");
    if (existing && existing.kind === "upsert") existing.row = { ...existing.row, ...input.row };
    else queue.push({ id: crypto.randomUUID(), kind: "upsert", table: input.table, key, row: input.row, tries: 0 });
  } else if (input.kind === "update") {
    const existing = queue.find((op) => same(op) && (op.kind === "upsert" || op.kind === "update"));
    if (existing?.kind === "upsert") existing.row = { ...existing.row, ...input.patch };
    else if (existing?.kind === "update") existing.patch = { ...existing.patch, ...input.patch };
    else queue.push({ id: crypto.randomUUID(), kind: "update", table: input.table, key, patch: input.patch, tries: 0 });
  } else {
    queue = queue.filter((op) => !same(op));
    queue.push({ id: crypto.randomUUID(), kind: "delete", table: input.table, key, tries: 0 });
  }
  persist();
  emit();
  ensureTimer();
  void flush();
}

function isNetworkError(error: { message?: string; status?: number; code?: string } | null) {
  if (!error) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return /fetch|network|load failed|timeout|jwt|token/i.test(error.message ?? "") || error.code === "PGRST301";
}

async function send(op: Op): Promise<"ok" | "retry" | "fatal"> {
  const supabase = createClient();
  try {
    const query =
      op.kind === "upsert"
        ? supabase.from(op.table).upsert(op.row, { onConflict: "id" })
        : op.kind === "update"
          ? supabase.from(op.table).update(op.patch).eq("id", op.key)
          : supabase.from(op.table).delete().eq("id", op.key);
    const { error } = await query;
    if (!error) return "ok";
    return isNetworkError(error) ? "retry" : "fatal";
  } catch {
    return "retry";
  }
}

export async function flush() {
  load();
  if (flushing || queue.length === 0) return;
  flushing = true;
  emit();
  try {
    while (queue.length > 0) {
      const op = queue[0];
      inflightId = op.id;
      const result = await send(op);
      inflightId = null;
      if (result === "retry") {
        offline = typeof navigator !== "undefined" && !navigator.onLine;
        break;
      }
      if (result === "fatal") {
        op.tries += 1;
        if (op.tries < MAX_TRIES) {
          persist();
          break;
        }
        try {
          const dead = JSON.parse(localStorage.getItem(DEAD_KEY) ?? "[]");
          localStorage.setItem(DEAD_KEY, JSON.stringify([...dead, op].slice(-50)));
        } catch {}
      }
      queue.shift();
      persist();
      if (result === "ok") {
        offline = false;
        const event: SyncedEvent = { table: op.table, key: op.key, row: op.kind === "upsert" ? op.row : undefined };
        syncedListeners.forEach((l) => l(event));
      }
      emit();
    }
  } finally {
    inflightId = null;
    flushing = false;
    emit();
  }
}

export function hasPendingFor(table: Table, key: string) {
  load();
  return queue.some((op) => op.table === table && op.key === key);
}

export function subscribeStatus(listener: (s: SyncStatus) => void) {
  load();
  statusListeners.add(listener);
  listener(status());
  ensureTimer();
  if (queue.length > 0) void flush();
  return () => {
    statusListeners.delete(listener);
  };
}

export function onSynced(listener: (e: SyncedEvent) => void) {
  syncedListeners.add(listener);
  return () => {
    syncedListeners.delete(listener);
  };
}
