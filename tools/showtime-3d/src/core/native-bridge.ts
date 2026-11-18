/**
 * Ponte com o backend Rust (Tauri v2) — PoC "Opção B".
 *
 * No navegador comum (vite dev / preview) este módulo não faz nada.
 * Dentro do executável Tauri ele envia o relatório de sessão para o comando
 * Rust `save_session_telemetry`, que valida o payload com serde e grava em
 * app_log_dir (diretório de logs do SO, sem acesso arbitrário a filesystem).
 *
 *  - [F9]      grava o relatório agora (evidência manual)
 *  - pagehide  grava ao fechar a janela (best effort)
 *  - a cada 60 s grava automaticamente (garante relatório mesmo em crash)
 */
import { profiler } from './profiler';

interface SessionReport {
  session_id: string;
  app_version: string;
  duration_s: number;
  fps_avg: number;
  fps_low_1pct: number;
  frame_time_ms_max: number;
  draw_calls_peak: number;
  geometries: number;
  textures: number;
  js_heap_mb: number | null;
  audio_state: string;
  events: string[];
}

const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const sessionId = `s${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function buildReport(): SessionReport {
  const s = profiler.snapshot();
  return {
    session_id: sessionId,
    app_version: '0.1.0',
    duration_s: s.sessionSeconds,
    fps_avg: s.fps.avg,
    fps_low_1pct: s.fps.low1pct,
    frame_time_ms_max: s.fps.frameTimeMsMax,
    draw_calls_peak: s.render.maxDrawCalls,
    geometries: s.memory.geometries,
    textures: s.memory.textures,
    js_heap_mb: s.memory.jsHeapUsedMB,
    audio_state: s.audio[0]?.state ?? 'none',
    events: s.events.slice(-50).map((e) => `${e.t}s ${e.label}`)
  };
}

export async function saveSessionTelemetry(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await invoke<string>('save_session_telemetry', { report: buildReport() });
    console.info('[telemetria] relatório salvo em', path);
    return path;
  } catch (err) {
    console.warn('[telemetria] falha ao salvar relatório', err);
    return null;
  }
}

export function installNativeBridge(): void {
  if (!isTauri()) return;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F9') {
      e.preventDefault();
      profiler.mark('F9 (salvar telemetria)');
      void saveSessionTelemetry();
    }
  });
  window.setInterval(() => void saveSessionTelemetry(), 60_000);
  window.addEventListener('pagehide', () => void saveSessionTelemetry());
}
