export interface ShowtimeUI {
  setProgress: (label: string, current: number, total: number) => void;
  hideLoading: () => void;
  showGameOver: (reason?: string) => void;
  triggerReunionFlash: () => void;
  updateAudioButton: (playing: boolean) => void;
  setAudioError: () => void;
  audioButton: HTMLButtonElement;
  dispose: () => void;
}

const ASCII_BANNER = [
  '███████╗██╗  ██╗ ██████╗ ██╗    ██╗████████╗██╗███╗   ███╗███████╗',
  '██╔════╝██║  ██║██╔═══██╗██║    ██║╚══██╔══╝██║████╗ ████║██╔════╝',
  '███████╗███████║██║   ██║██║ █╗ ██║   ██║   ██║██╔████╔██║█████╗  ',
  '╚════██║██╔══██║██║   ██║██║███╗██║   ██║   ██║██║╚██╔╝██║██╔══╝  ',
  '███████║██║  ██║╚██████╔╝╚███╔███╔╝   ██║   ██║██║ ╚═╝ ██║███████╗',
  '╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝    ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝'
].join('\n');

export function createShowtimeUI(
  container: HTMLElement,
  onToggleBand: () => void
): ShowtimeUI {
  const styleId = 'showtime-aaa-overlay-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes asciiRainbowWave {
        0% { background-position: 0% 50%; filter: drop-shadow(0 0 14px rgba(244, 63, 94, 0.55)); }
        50% { background-position: 100% 50%; filter: drop-shadow(0 0 22px rgba(168, 85, 247, 0.75)); }
        100% { background-position: 0% 50%; filter: drop-shadow(0 0 14px rgba(56, 189, 248, 0.55)); }
      }
      @keyframes asciiGlitchSkew {
        0%, 92%, 100% { transform: skewX(0deg); }
        94% { transform: skewX(-4deg); }
        96% { transform: skewX(3deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- Tela de Carregamento ASCII AAA ----------
  const loadingScreen = document.createElement('div');
  Object.assign(loadingScreen.style, {
    position: 'fixed', inset: '0', zIndex: '2100',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '22px', padding: '24px',
    background: 'radial-gradient(circle at 50% 45%, #160720 0%, #040207 100%)',
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
    transition: 'opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
  });

  const asciiPre = document.createElement('pre');
  asciiPre.textContent = ASCII_BANNER;
  Object.assign(asciiPre.style, {
    margin: '0',
    fontSize: 'clamp(8px, 1.45vw, 17px)',
    lineHeight: '1.12',
    fontWeight: '800',
    letterSpacing: '0.02em',
    userSelect: 'none',
    background: 'linear-gradient(90deg, #f43f5e, #c084fc, #38bdf8, #fb7185, #f43f5e)',
    backgroundSize: '300% 300%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    animation: 'asciiRainbowWave 4s ease infinite, asciiGlitchSkew 5s infinite'
  });

  const subTag = document.createElement('div');
  subTag.textContent = '// NÃO ESPERE MUITO DO FIM DO MUNDO — ENGINE BOOT';
  Object.assign(subTag.style, {
    fontSize: '13px',
    letterSpacing: '0.24em',
    color: '#94a3b8',
    textAlign: 'center'
  });

  const progressWrapper = document.createElement('div');
  Object.assign(progressWrapper.style, {
    width: 'min(520px, 88vw)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  });

  const progressHeader = document.createElement('div');
  Object.assign(progressHeader.style, {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#cbd5e1'
  });

  const loadingStatus = document.createElement('span');
  loadingStatus.textContent = '> Inicializando shaders e multidão...';

  const loadingPct = document.createElement('span');
  loadingPct.textContent = '0%';
  loadingPct.style.color = '#fb7185';
  loadingPct.style.fontWeight = '800';

  progressHeader.append(loadingStatus, loadingPct);

  const progressTrack = document.createElement('div');
  Object.assign(progressTrack.style, {
    width: '100%', height: '6px', borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.06)'
  });

  const progressBar = document.createElement('div');
  Object.assign(progressBar.style, {
    width: '5%', height: '100%',
    background: 'linear-gradient(90deg, #f43f5e, #a855f7, #38bdf8)',
    boxShadow: '0 0 14px rgba(244, 63, 94, 0.8)',
    transition: 'width 0.22s ease'
  });

  progressTrack.appendChild(progressBar);
  progressWrapper.append(progressHeader, progressTrack);
  loadingScreen.append(asciiPre, subTag, progressWrapper);
  container.appendChild(loadingScreen);

  // ---------- Game Over ----------
  const gameOverScreen = document.createElement('div');
  Object.assign(gameOverScreen.style, {
    position: 'fixed', inset: '0', zIndex: '1980', display: 'none',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '18px', background: 'rgba(4, 2, 9, 0.94)',
    backdropFilter: 'blur(16px)', color: '#f8fafc',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    textAlign: 'center', padding: '28px'
  });

  const gameOverTitle = document.createElement('div');
  gameOverTitle.textContent = '// CONEXÃO PERDIDA';
  Object.assign(gameOverTitle.style, {
    fontSize: '30px', fontWeight: '800', letterSpacing: '0.2em',
    color: '#f43f5e', textShadow: '0 0 28px rgba(244, 63, 94, 0.6)'
  });

  const gameOverText = document.createElement('div');
  gameOverText.textContent =
    'A noite engoliu a pista e você perdeu ela de vista na multidão.';
  Object.assign(gameOverText.style, {
    fontSize: '15px', color: '#cbd5e1', maxWidth: '460px', lineHeight: '1.6'
  });

  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.textContent = '> REINICIAR NOITE [R]';
  Object.assign(retryButton.style, {
    marginTop: '8px', padding: '13px 28px', border: '1px solid #f43f5e',
    borderRadius: '8px', background: 'rgba(225, 29, 72, 0.2)',
    color: '#ffe4e6', fontFamily: 'inherit', fontSize: '14px',
    fontWeight: '800', letterSpacing: '0.08em', cursor: 'pointer'
  });
  retryButton.addEventListener('click', () => window.location.reload());

  gameOverScreen.append(gameOverTitle, gameOverText, retryButton);
  container.appendChild(gameOverScreen);

  // ---------- Overlay de Reencontro ----------
  const enlightenmentOverlay = document.createElement('div');
  Object.assign(enlightenmentOverlay.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '900',
    background:
      'radial-gradient(circle at 50% 50%, rgba(255, 241, 242, 0.95) 0%, rgba(244, 63, 94, 0.45) 55%, rgba(255, 255, 255, 0) 100%)',
    opacity: '0',
    transition: 'opacity 1.6s cubic-bezier(0.22, 1, 0.36, 1)'
  });
  container.appendChild(enlightenmentOverlay);

  // ---------- Botão Minimalista de Som (Canto inferior direito) ----------
  const audioButton = document.createElement('button');
  audioButton.type = 'button';
  audioButton.textContent = '♪ SOM: OFF';
  audioButton.title = 'Ligar/Desligar banda (Espaço)';
  Object.assign(audioButton.style, {
    position: 'fixed', right: '24px', bottom: '24px', zIndex: '1100',
    padding: '10px 16px', border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: '8px', background: 'rgba(10, 6, 18, 0.72)',
    backdropFilter: 'blur(10px)', color: '#cbd5e1',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em',
    cursor: 'pointer', transition: 'all 0.2s ease'
  });
  audioButton.addEventListener('click', onToggleBand);
  container.appendChild(audioButton);

  let loadingHidden = false;

  return {
    audioButton,
    setProgress(label, current, total) {
      const pct = Math.min(100, Math.round((current / total) * 100));
      loadingStatus.textContent = `> Carregando: ${label}`;
      loadingPct.textContent = `${pct}%`;
      progressBar.style.width = `${pct}%`;
    },
    hideLoading() {
      if (loadingHidden) return;
      loadingHidden = true;
      loadingStatus.textContent = '> SISTEMA PRONTO';
      loadingPct.textContent = '100%';
      progressBar.style.width = '100%';
      window.setTimeout(() => {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.pointerEvents = 'none';
        window.setTimeout(() => loadingScreen.remove(), 460);
      }, 280);
    },
    showGameOver(reason) {
      if (reason) gameOverText.textContent = reason;
      gameOverScreen.style.display = 'flex';
    },
    triggerReunionFlash() {
      enlightenmentOverlay.style.opacity = '1';
      window.setTimeout(() => {
        enlightenmentOverlay.style.opacity = '0.18';
      }, 1400);
    },
    updateAudioButton(playing) {
      if (playing) {
        audioButton.textContent = '♪ AO VIVO • 116 BPM';
        audioButton.style.borderColor = '#f43f5e';
        audioButton.style.color = '#ffe4e6';
        audioButton.style.boxShadow = '0 0 18px rgba(244, 63, 94, 0.45)';
      } else {
        audioButton.textContent = '♪ SOM: PAUSADO';
        audioButton.style.borderColor = 'rgba(255, 255, 255, 0.16)';
        audioButton.style.color = '#cbd5e1';
        audioButton.style.boxShadow = 'none';
      }
    },
    setAudioError() {
      audioButton.textContent = '♪ ERRO ÁUDIO';
    },
    dispose() {
      audioButton.removeEventListener('click', onToggleBand);
      audioButton.remove();
      enlightenmentOverlay.remove();
      loadingScreen.remove();
      gameOverScreen.remove();
    }
  };
}
