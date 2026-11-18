export interface HUDOptions {
  onTimeUp?: () => void;
}

export interface HUDController {
  update: (message: string, durationMs?: number) => void;
  setActionPrompt: (label: string | null) => void;
  setSoberLevel: (bacPercent: number) => void;
  deductTime: (seconds: number) => void;
  getRemainingSeconds: () => number;
  destroy: () => void;
}

export function createHUD(container: HTMLElement, options?: HUDOptions): HUDController {
  const styleId = 'showtime-hacker-cinematic-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Space+Grotesk:wght@500;700&display=swap');

      @keyframes hudBlink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      @keyframes scanlineMove {
        0% { background-position: 0 0; }
        100% { background-position: 0 100px; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  const monoFont = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
  const displayFont = "'Space Grotesk', system-ui, sans-serif";

  // =========================================================================
  // 1. INTRO CINEMATOGRÁFICA (EXIBIDA APÓS O BOOT ASCII)
  // =========================================================================
  const introOverlay = document.createElement('div');
  Object.assign(introOverlay.style, {
    position: 'fixed', inset: '0', zIndex: '1950',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '28px',
    background: 'rgba(4, 2, 8, 0.88)',
    backdropFilter: 'blur(12px)',
    fontFamily: monoFont, color: '#e2e8f0',
    transition: 'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)'
  });

  const scanlines = document.createElement('div');
  Object.assign(scanlines.style, {
    position: 'absolute', inset: '0', pointerEvents: 'none',
    background:
      'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.25) 0px, rgba(0, 0, 0, 0.25) 1px, transparent 1px, transparent 3px)',
    animation: 'scanlineMove 8s linear infinite', opacity: '0.5'
  });
  introOverlay.appendChild(scanlines);

  const terminalBox = document.createElement('div');
  Object.assign(terminalBox.style, {
    position: 'relative', width: '100%', maxWidth: '620px',
    padding: '32px', borderRadius: '12px',
    background: 'rgba(8, 5, 14, 0.94)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
    display: 'flex', flexDirection: 'column', gap: '20px'
  });

  const movieTitle = document.createElement('h1');
  movieTitle.textContent = 'NÃO ESPERE MUITO DO FIM DO MUNDO';
  Object.assign(movieTitle.style, {
    margin: '0', fontFamily: displayFont,
    fontSize: 'clamp(20px, 2.8vw, 26px)', fontWeight: '700',
    letterSpacing: '0.1em', color: '#ffffff'
  });

  const storyContainer = document.createElement('div');
  Object.assign(storyContainer.style, {
    minHeight: '96px', fontSize: '15px', lineHeight: '1.75', color: '#cbd5e1'
  });

  const storyTextSpan = document.createElement('span');
  storyTextSpan.style.whiteSpace = 'pre-line';
  const cursorSpan = document.createElement('span');
  cursorSpan.textContent = '█';
  Object.assign(cursorSpan.style, {
    color: '#f43f5e', marginLeft: '4px', animation: 'hudBlink 0.9s infinite'
  });
  storyContainer.append(storyTextSpan, cursorSpan);

  const introFooter = document.createElement('div');
  Object.assign(introFooter.style, {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
    justifyContent: 'space-between', gap: '14px',
    paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)'
  });

  const hintLabel = document.createElement('span');
  hintLabel.textContent = '[WASD] Mover • [SHIFT] Correr • [E] Abordar';
  Object.assign(hintLabel.style, { fontSize: '12px', color: '#64748b' });

  const enterButton = document.createElement('button');
  enterButton.type = 'button';
  enterButton.textContent = 'ENTRAR NA PISTA [ENTER]';
  Object.assign(enterButton.style, {
    padding: '11px 22px', borderRadius: '6px',
    border: '1px solid #f43f5e', background: '#e11d48',
    color: '#ffffff', fontFamily: monoFont, fontSize: '13px',
    fontWeight: '800', letterSpacing: '0.08em', cursor: 'pointer'
  });

  introFooter.append(hintLabel, enterButton);
  terminalBox.append(movieTitle, storyContainer, introFooter);
  introOverlay.appendChild(terminalBox);
  container.appendChild(introOverlay);

  const fullStory = [
    '> Você bebeu demais durante o show e se perdeu dela na multidão.',
    '> As luzes giram, o grave distorce tudo — mas ela ainda está nos cantos do pub.',
    '> Encontre-a antes que a noite acabe.'
  ].join('\n');

  let charIndex = 0;
  const typeInterval = window.setInterval(() => {
    if (charIndex < fullStory.length) {
      storyTextSpan.textContent += fullStory[charIndex++];
    } else {
      window.clearInterval(typeInterval);
    }
  }, 20);

  let introDismissed = false;
  function dismissIntro(): void {
    if (introDismissed) return;
    introDismissed = true;
    window.clearInterval(typeInterval);
    introOverlay.style.opacity = '0';
    introOverlay.style.pointerEvents = 'none';
    window.setTimeout(() => introOverlay.remove(), 720);
  }

  enterButton.addEventListener('click', dismissIntro);
  function onIntroKeyDown(e: KeyboardEvent): void {
    if (!introDismissed && (e.key === 'Enter' || e.key === 'Escape')) {
      e.preventDefault();
      dismissIntro();
    }
  }
  window.addEventListener('keydown', onIntroKeyDown);

  // =========================================================================
  // 2. BARRA SUPERIOR AAA MINIMALISTA (SEM POLUIÇÃO VISUAL)
  // =========================================================================
  const topBar = document.createElement('div');
  Object.assign(topBar.style, {
    position: 'fixed', top: '20px', left: '24px', right: '24px',
    zIndex: '1100', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', pointerEvents: 'none',
    fontFamily: monoFont
  });

  // Bloco Esquerdo: Objetivo limpo em 1 linha
  const missionPill = document.createElement('div');
  Object.assign(missionPill.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 16px', borderRadius: '8px',
    background: 'rgba(8, 5, 14, 0.68)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)', fontSize: '13px', color: '#f1f5f9'
  });
  missionPill.innerHTML =
    '<span style="color:#f43f5e;font-weight:800;">◆</span> <span>OBJETIVO: ENCONTRE SUA NAMORADA</span>';

  // Bloco Direito: BAC + Cronômetro
  const telemetryPill = document.createElement('div');
  Object.assign(telemetryPill.style, {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '10px 16px', borderRadius: '8px',
    background: 'rgba(8, 5, 14, 0.68)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)', fontSize: '13px'
  });

  const bacLabel = document.createElement('span');
  bacLabel.textContent = 'ÁLCOOL 0.19%';
  bacLabel.style.color = '#c084fc';
  bacLabel.style.fontWeight = '700';

  const divider = document.createElement('span');
  divider.textContent = '|';
  divider.style.color = 'rgba(255,255,255,0.15)';

  const clockLabel = document.createElement('span');
  clockLabel.textContent = '03:00';
  clockLabel.style.color = '#f8fafc';
  clockLabel.style.fontWeight = '800';
  clockLabel.style.letterSpacing = '0.06em';

  telemetryPill.append(bacLabel, divider, clockLabel);
  topBar.append(missionPill, telemetryPill);
  container.appendChild(topBar);

  // =========================================================================
  // 3. PROMPT CONTEXTUAL DE INTERAÇÃO (CENTRO INFERIOR — FOCO DO OLHAR)
  // =========================================================================
  const actionPrompt = document.createElement('div');
  Object.assign(actionPrompt.style, {
    position: 'fixed', bottom: '84px', left: '50%',
    transform: 'translateX(-50%) translateY(8px)',
    zIndex: '1150', padding: '10px 20px', borderRadius: '999px',
    background: 'rgba(10, 6, 18, 0.86)',
    border: '1px solid rgba(244, 63, 94, 0.65)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(10px)',
    fontFamily: monoFont, fontSize: '13px', fontWeight: '700',
    color: '#ffe4e6', letterSpacing: '0.06em',
    opacity: '0', pointerEvents: 'none',
    transition: 'opacity 0.2s ease, transform 0.2s ease'
  });
  container.appendChild(actionPrompt);

  // =========================================================================
  // 4. TOAST SUTIL DE EVENTOS (ABAIXO DA BARRA SUPERIOR)
  // =========================================================================
  const toastBar = document.createElement('div');
  Object.assign(toastBar.style, {
    position: 'fixed', top: '72px', left: '24px',
    zIndex: '1100', padding: '9px 14px', borderRadius: '6px',
    background: 'rgba(10, 6, 18, 0.82)',
    borderLeft: '3px solid #f43f5e',
    fontFamily: monoFont, fontSize: '13px', color: '#e2e8f0',
    opacity: '0', pointerEvents: 'none',
    transition: 'opacity 0.25s ease'
  });
  container.appendChild(toastBar);

  let remainingSeconds = 180;
  let timeUpTriggered = false;

  function renderClock(): void {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    clockLabel.textContent = `${mins}:${secs}`;
    clockLabel.style.color = remainingSeconds <= 30 ? '#f43f5e' : '#f8fafc';
  }

  const clockInterval = window.setInterval(() => {
    if (!introDismissed || timeUpTriggered) return;
    if (remainingSeconds > 0) {
      remainingSeconds--;
      renderClock();
    } else {
      timeUpTriggered = true;
      options?.onTimeUp?.();
    }
  }, 1000);

  let hideTimeout: number | null = null;

  return {
    update(message: string, durationMs = 3400): void {
      toastBar.textContent = message;
      toastBar.style.opacity = '1';
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
      if (durationMs > 0) {
        hideTimeout = window.setTimeout(() => {
          toastBar.style.opacity = '0';
        }, durationMs);
      }
    },
    setActionPrompt(label: string | null): void {
      if (label) {
        actionPrompt.textContent = label;
        actionPrompt.style.opacity = '1';
        actionPrompt.style.transform = 'translateX(-50%) translateY(0)';
      } else {
        actionPrompt.style.opacity = '0';
        actionPrompt.style.transform = 'translateX(-50%) translateY(8px)';
      }
    },
    setSoberLevel(bacPercent: number): void {
      bacLabel.textContent = `ÁLCOOL ${bacPercent.toFixed(2)}%`;
    },
    deductTime(seconds: number): void {
      remainingSeconds = Math.max(0, remainingSeconds - seconds);
      renderClock();
      if (remainingSeconds === 0 && !timeUpTriggered) {
        timeUpTriggered = true;
        options?.onTimeUp?.();
      }
    },
    getRemainingSeconds(): number {
      return remainingSeconds;
    },
    destroy(): void {
      window.clearInterval(typeInterval);
      window.clearInterval(clockInterval);
      window.removeEventListener('keydown', onIntroKeyDown);
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
      introOverlay.remove();
      topBar.remove();
      actionPrompt.remove();
      toastBar.remove();
    }
  };
}
