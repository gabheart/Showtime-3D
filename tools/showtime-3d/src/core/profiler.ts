/**
 * Profiler / telemetria em tempo real do Showtime 3D.
 *
 * Módulo puramente aditivo: não altera nenhuma mecânica do jogo.
 *  - [F2]  mostra/oculta o painel de diagnóstico
 *  - [F8]  baixa um snapshot JSON (evidência para o relatório antes × depois)
 *  - [F9]  grava o relatório de sessão no disco (somente no executável Tauri)
 *
 * Coleta: FPS médio, 1% low, frame time (ms), renderer.info (geometrias,
 * texturas, draw calls, triângulos), performance.memory (Chromium/WebView2)
 * e estado dos AudioContext (sampleRate, state, nós criados/conectados).
 */
import type * as THREE from 'three';

const WINDOW_SIZE = 600; // ~10 s a 60 Hz

export interface ProfilerSnapshot {
  timestamp: string;
  sessionSeconds: number;
  fps: { avg: number; low1pct: number; frameTimeMsAvg: number; frameTimeMsMax: number };
  render: { drawCalls: number; maxDrawCalls: number; triangles: number };
  memory: { geometries: number; textures: number; jsHeapUsedMB: number | null; jsHeapLimitMB: number | null };
  audio: Array<{ sampleRate: number; state: AudioContextState; nodesCreated: number; nodesConnected: number }>;
  events: Array<{ t: number; label: string }>;
}

interface TrackedContext {
  ctx: BaseAudioContext;
  created: number;
  connected: Set<AudioNode>;
}

const trackedContexts: TrackedContext[] = [];
let audioPatched = false;

/**
 * Instrumenta a Web Audio API sem tocar no código de áudio do jogo:
 * conta nós criados por contexto e acompanha connect()/disconnect().
 * Precisa rodar antes do primeiro `new AudioContext()`.
 */
function patchWebAudio(): void {
  if (audioPatched || typeof window === 'undefined' || !('AudioContext' in window)) return;
  audioPatched = true;

  const find = (ctx: BaseAudioContext): TrackedContext => {
    let entry = trackedContexts.find((t) => t.ctx === ctx);
    if (!entry) {
      entry = { ctx, created: 0, connected: new Set() };
      trackedContexts.push(entry);
    }
    return entry;
  };

  const proto = BaseAudioContext.prototype as unknown as Record<string, unknown>;
  for (const key of Object.getOwnPropertyNames(BaseAudioContext.prototype)) {
    if (!key.startsWith('create')) continue;
    const original = proto[key];
    if (typeof original !== 'function') continue;
    proto[key] = function (this: BaseAudioContext, ...args: unknown[]) {
      const node = (original as (...a: unknown[]) => unknown).apply(this, args);
      if (node instanceof AudioNode) find(this).created++;
      return node;
    };
  }

  const nodeProto = AudioNode.prototype as unknown as {
    connect: (...a: unknown[]) => unknown;
    disconnect: (...a: unknown[]) => unknown;
  };
  const originalConnect = nodeProto.connect;
  const originalDisconnect = nodeProto.disconnect;
  nodeProto.connect = function (this: AudioNode, ...args: unknown[]) {
    find(this.context).connected.add(this);
    return originalConnect.apply(this, args);
  };
  nodeProto.disconnect = function (this: AudioNode, ...args: unknown[]) {
    if (args.length === 0) find(this.context).connected.delete(this);
    return originalDisconnect.apply(this, args);
  };
}

// Instala os ganchos de áudio no carregamento do módulo (antes do RockBandAudio).
patchWebAudio();

class Profiler {
  private renderer: THREE.WebGLRenderer | null = null;
  private frameTimes: number[] = [];
  private lastFrame = 0;
  private drawCalls = 0;
  private maxDrawCalls = 0;
  private triangles = 0;
  private readonly startedAt = performance.now();
  private readonly events: Array<{ t: number; label: string }> = [];
  private panel: HTMLPreElement | null = null;
  private panelTimer = 0;
  private listeners: Array<() => void> = [];

  attach(renderer: THREE.WebGLRenderer): void {
    if (this.renderer) return;
    this.renderer = renderer;

    // Embrulha render() para medir cada frame logo após o desenho.
    const originalRender = renderer.render.bind(renderer);
    renderer.render = (scene, camera) => {
      originalRender(scene, camera);
      this.sampleFrame();
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'F2') {
        e.preventDefault();
        this.togglePanel();
      } else if (e.code === 'F8') {
        e.preventDefault();
        this.downloadSnapshot();
      } else if (e.code === 'Space') {
        this.mark('ESPAÇO (música play/pause)');
      } else if (e.code === 'KeyR') {
        this.mark('R (reiniciar)');
      }
    };
    window.addEventListener('keydown', onKey);
    this.listeners.push(() => window.removeEventListener('keydown', onKey));
    this.mark('início da sessão');
  }

  /** Marca um evento na linha do tempo (aparece no JSON de evidência). */
  mark(label: string): void {
    this.events.push({ t: +((performance.now() - this.startedAt) / 1000).toFixed(2), label });
    if (this.events.length > 200) this.events.shift();
  }

  private sampleFrame(): void {
    const now = performance.now();
    if (this.lastFrame > 0) {
      this.frameTimes.push(now - this.lastFrame);
      if (this.frameTimes.length > WINDOW_SIZE) this.frameTimes.shift();
    }
    this.lastFrame = now;

    const info = this.renderer!.info.render;
    this.drawCalls = info.calls;
    this.triangles = info.triangles;
    if (info.calls > this.maxDrawCalls) this.maxDrawCalls = info.calls;
  }

  snapshot(): ProfilerSnapshot {
    const times = this.frameTimes;
    const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const sorted = [...times].sort((a, b) => b - a);
    const worstCount = Math.max(1, Math.floor(sorted.length * 0.01));
    const worstAvg = sorted.length ? sorted.slice(0, worstCount).reduce((a, b) => a + b, 0) / worstCount : 0;
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const info = this.renderer?.info;

    return {
      timestamp: new Date().toISOString(),
      sessionSeconds: +((performance.now() - this.startedAt) / 1000).toFixed(1),
      fps: {
        avg: avgMs ? +(1000 / avgMs).toFixed(1) : 0,
        low1pct: worstAvg ? +(1000 / worstAvg).toFixed(1) : 0,
        frameTimeMsAvg: +avgMs.toFixed(2),
        frameTimeMsMax: +(sorted[0] ?? 0).toFixed(2)
      },
      render: { drawCalls: this.drawCalls, maxDrawCalls: this.maxDrawCalls, triangles: this.triangles },
      memory: {
        geometries: info?.memory.geometries ?? 0,
        textures: info?.memory.textures ?? 0,
        jsHeapUsedMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null,
        jsHeapLimitMB: mem ? +(mem.jsHeapSizeLimit / 1048576).toFixed(0) : null
      },
      audio: trackedContexts.map((t) => ({
        sampleRate: t.ctx.sampleRate,
        state: t.ctx.state,
        nodesCreated: t.created,
        nodesConnected: t.connected.size
      })),
      events: [...this.events]
    };
  }

  private togglePanel(): void {
    if (this.panel) {
      window.clearInterval(this.panelTimer);
      this.panel.remove();
      this.panel = null;
      return;
    }
    const pre = document.createElement('pre');
    pre.setAttribute('aria-label', 'Painel de telemetria');
    Object.assign(pre.style, {
      position: 'fixed',
      top: '8px',
      right: '8px',
      zIndex: '9999',
      margin: '0',
      padding: '10px 12px',
      background: 'rgba(6, 6, 12, 0.86)',
      color: '#9ef7c4',
      font: '12px/1.45 ui-monospace, Consolas, monospace',
      border: '1px solid rgba(158, 247, 196, 0.35)',
      borderRadius: '6px',
      pointerEvents: 'none',
      whiteSpace: 'pre'
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(pre);
    this.panel = pre;
    const draw = (): void => {
      const s = this.snapshot();
      const audio = s.audio
        .map((a, i) => `  ctx#${i} ${a.state} ${a.sampleRate}Hz  nós ${a.nodesConnected}/${a.nodesCreated}`)
        .join('\n');
      pre.textContent =
        `PROFILER [F2]   snapshot [F8]\n` +
        `FPS médio   ${s.fps.avg}\n` +
        `1% low      ${s.fps.low1pct}\n` +
        `frame       ${s.fps.frameTimeMsAvg} ms (máx ${s.fps.frameTimeMsMax})\n` +
        `draw calls  ${s.render.drawCalls} (pico ${s.render.maxDrawCalls})\n` +
        `triângulos  ${s.render.triangles}\n` +
        `geometrias  ${s.memory.geometries}\n` +
        `texturas    ${s.memory.textures}\n` +
        `heap JS     ${s.memory.jsHeapUsedMB ?? 'n/d'} MB\n` +
        `áudio\n${audio || '  (nenhum AudioContext ainda)'}`;
    };
    draw();
    this.panelTimer = window.setInterval(draw, 250);
  }

  private downloadSnapshot(): void {
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetria-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  dispose(): void {
    this.listeners.forEach((off) => off());
    this.listeners = [];
    if (this.panel) this.togglePanel();
  }
}

export const profiler = new Profiler();

export function attachProfiler(renderer: THREE.WebGLRenderer): void {
  profiler.attach(renderer);
}
