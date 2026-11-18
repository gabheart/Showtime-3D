import * as THREE from 'three';

import { createRenderer } from './renderer';
import { attachProfiler } from './profiler';
import { createCamera, createCameraControls } from './camera';
import { startLoop } from './loop';
import { ColliderSystem } from './colliders';

import {
  loadMusician,
  loadAnimationClip,
  type MusicianController,
  type PerformancePhase
} from '../characters/musician';
import { loadInstrument } from '../characters/instruments';
import { attachToMusician, attachRockDrumsticks } from '../characters/attachments';
import { createCrowd, ACTIVE_CROWD_COUNT, type CrowdController } from '../characters/crowd';

import { InputController } from '../player/input';
import { createPlayer, type PlayerController } from '../player/player';
import { InteractionSystem } from '../player/interactions';

import { createPub } from '../world/pub';
import { createStage } from '../world/stage';
import { createLighting } from '../world/lighting';
import { RockBandAudio } from '../audio/rock-band';
import { createHUD } from '../ui/hud';
import { createShowtimeUI } from '../ui/overlays';

const HIDING_SPOTS: Array<{ pos: [number, number, number]; rotY: number }> = [
  { pos: [-5.4, -0.02, -1.6], rotY: 1.2 },
  { pos: [5.4, -0.02, -1.5], rotY: -1.2 },
  { pos: [-5.8, -0.02, 2.4], rotY: 1.8 },
  { pos: [5.8, -0.02, 2.6], rotY: -1.8 },
  { pos: [-4.9, -0.02, 5.2], rotY: 2.5 },
  { pos: [4.9, -0.02, 5.1], rotY: -2.5 },
  { pos: [-2.1, -0.02, 5.6], rotY: 3.05 },
  { pos: [2.2, -0.02, 5.5], rotY: -3.0 }
];

const MAX_MISTAKES = 3;

export function createShowtime(): void {
  const container = document.querySelector<HTMLElement>('#app');
  if (!container) throw new Error('Elemento #app não encontrado no HTML.');
  const appContainer: HTMLElement = container;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06030a);

  const camera = createCamera(appContainer);
  const renderer = createRenderer(appContainer);
  attachProfiler(renderer); // telemetria [F2] — gancho aditivo, não altera mecânicas
  const controls = createCameraControls(camera, renderer.domElement);
  const colliders = new ColliderSystem();
  const interactions = new InteractionSystem();

  let rockBand: RockBandAudio | null = null;
  let performancePhase: PerformancePhase = 'pre';
  let hasStartedOnce = false;
  let gameEnded = false;

  // Estados de gameplay AAA
  let bacLevel = 0.19;
  let mistakesCount = 0;
  let lastPingTime = -10;
  const approachedIds = new Set<string>();

  const ui = createShowtimeUI(appContainer, () => void toggleBand());

  function endGameLoss(reason: string): void {
    if (gameEnded) return;
    gameEnded = true;
    rockBand?.stop();
    hud.setActionPrompt(null);
    targetRing.visible = false;
    renderer.toneMappingExposure = 0.22;
    ui.showGameOver(reason);
  }

  const hud = createHUD(appContainer, {
    onTimeUp: () =>
      endGameLoss('O show terminou, as luzes do pub se acenderam e você não a encontrou a tempo.')
  });

  async function toggleBand(): Promise<void> {
    if (gameEnded) return;
    try {
      if (!rockBand) rockBand = new RockBandAudio();
      if (rockBand.isPlaying) {
        rockBand.stop();
        performancePhase = 'post';
        ui.updateAudioButton(false);
        hud.update('A banda silencia no palco...', 2600);
      } else {
        await rockBand.start();
        hasStartedOnce = true;
        performancePhase = 'playing';
        ui.updateAudioButton(true);
        hud.update('Banda ao vivo (116 BPM) — use [Q] para chamar por ela!', 3000);
      }
    } catch (error) {
      ui.updateAudioButton(false);
      console.error('[SHOWTIME AUDIO]', error);
      ui.setAudioError();
    }
  }

  const pub = createPub();
  const stage = createStage();
  scene.add(pub.group, stage);
  colliders.register('Palco', stage, false);

  const lighting = createLighting(scene);

  const stageBandLight = new THREE.PointLight(0xfda4af, 5, 8, 2.0);
  stageBandLight.position.set(0, 3.4, -2.8);
  scene.add(stageBandLight);

  const girlfriendSpotlight = new THREE.PointLight(0xffe4e6, 0, 9, 2.0);
  scene.add(girlfriendSpotlight);

  // Anel diegético 3D no chão aos pés do NPC abordável
  const targetRingGeo = new THREE.RingGeometry(0.42, 0.52, 36);
  targetRingGeo.rotateX(-Math.PI / 2);
  const targetRingMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });
  const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
  targetRing.visible = false;
  scene.add(targetRing);

  // Onda visual 3D do Ecoar [Q]
  const echoWaveGeo = new THREE.RingGeometry(0.3, 0.45, 48);
  echoWaveGeo.rotateX(-Math.PI / 2);
  const echoWaveMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });
  const echoWaveMesh = new THREE.Mesh(echoWaveGeo, echoWaveMat);
  echoWaveMesh.visible = false;
  scene.add(echoWaveMesh);
  let echoPulse = 0;

  const stageLights: Array<{ light: THREE.Light; baseIntensity: number }> = [];
  scene.traverse((obj) => {
    if (
      obj !== girlfriendSpotlight &&
      (obj instanceof THREE.SpotLight || obj instanceof THREE.PointLight)
    ) {
      stageLights.push({ light: obj, baseIntensity: obj.intensity });
    }
  });

  const musicians: MusicianController[] = [];
  let player: PlayerController | null = null;
  let crowdController: CrowdController | null = null;
  let drumKitGroup: THREE.Group | null = null;
  let girlfriendGroup: THREE.Group | null = null;
  let girlfriendMixer: THREE.AnimationMixer | null = null;

  function triggerGirlfriendReunion(): void {
    if (gameEnded) return;
    gameEnded = true;
    hud.setActionPrompt(null);
    targetRing.visible = false;
    ui.triggerReunionFlash();
    renderer.toneMappingExposure = 1.65;
    girlfriendSpotlight.intensity = 80;

    const timeLeft = hud.getRemainingSeconds();
    const rank =
      mistakesCount === 0 && timeLeft >= 110
        ? 'RANK S — LENDA DA NOITE'
        : mistakesCount <= 1 && timeLeft >= 60
          ? 'RANK A — SOBREVIVENTE'
          : 'RANK B — POR UM TRIZ';

    hud.update(`VOCÊ A ENCONTROU! (${rank} • ${timeLeft}s restantes)`, 9000);
  }

  function handleWrongPerson(targetId: string): void {
    if (gameEnded) return;
    if (approachedIds.has(targetId)) {
      hud.update('Você já pediu desculpas para essa pessoa!', 2200);
      return;
    }

    approachedIds.add(targetId);
    mistakesCount++;
    hud.deductTime(25);
    bacLevel = Math.min(0.35, bacLevel + 0.02);
    hud.setSoberLevel(bacLevel);

    const remainingChances = MAX_MISTAKES - mistakesCount;
    if (remainingChances <= 0) {
      endGameLoss('Você abordou 3 estranhos e foi retirado do pub pelos seguranças.');
      return;
    }

    hud.update(
      `Pessoa errada! -25s no relógio (${remainingChances} ${remainingChances === 1 ? 'chance restante' : 'chances restantes'})`,
      3800
    );
  }

  function handleInteract(): void {
    if (gameEnded) return;
    const target = interactions.getActiveTarget();
    if (!target) return;

    if (target.isGirlfriend) {
      triggerGirlfriendReunion();
    } else {
      handleWrongPerson(target.id);
    }
  }

  function handleEchoPing(): void {
    if (gameEnded || !player || !girlfriendGroup) return;

    const now = performance.now() * 0.001;
    if (now - lastPingTime < 7) {
      const wait = Math.ceil(7 - (now - lastPingTime));
      hud.update(`Sem fôlego... Eco disponível em ${wait}s`, 1800);
      return;
    }
    lastPingTime = now;

    // Consequências: -8s no relógio e aumento de tontura
    hud.deductTime(8);
    bacLevel = Math.min(0.35, bacLevel + 0.025);
    hud.setSoberLevel(bacLevel);

    echoPulse = 1.0;
    echoWaveMesh.position.set(player.model.position.x, 0.02, player.model.position.z);
    echoWaveMesh.scale.setScalar(1);
    echoWaveMesh.visible = true;

    if (crowdController) {
      for (const npc of crowdController.models) {
        if (npc.position.distanceTo(player.model.position) < 5.5) {
          npc.lookAt(player.model.position.x, npc.position.y, player.model.position.z);
        }
      }
    }

    const toGirlfriend = new THREE.Vector3()
      .subVectors(girlfriendGroup.position, player.model.position)
      .setY(0);
    const distance = toGirlfriend.length();
    toGirlfriend.normalize();

    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();

    const camRight = new THREE.Vector3().crossVectors(camForward, THREE.Object3D.DEFAULT_UP);
    const dotF = camForward.dot(toGirlfriend);
    const dotR = camRight.dot(toGirlfriend);

    let directionHint = 'À SUA FRENTE';
    if (dotF < -0.5) directionHint = 'ATRÁS DE VOCÊ';
    else if (dotR > 0.45) directionHint = 'À SUA DIREITA';
    else if (dotR < -0.45) directionHint = 'À SUA ESQUERDA';

    const proximityText =
      distance < 3.2 ? 'QUASE LÁ!' : distance < 6.5 ? 'NA PISTA' : 'NOS CANTOS ESCUROS';

    hud.update(`ECO (-8s | +ÁLCOOL): Ela está ${directionHint} (${proximityText})`, 3600);
  }

  const input = new InputController(handleInteract, handleEchoPing);

  function onGlobalKeyDown(event: KeyboardEvent): void {
    if (gameEnded) return;
    if (event.code === 'Space' && document.activeElement !== ui.audioButton) {
      event.preventDefault();
      void toggleBand();
    }
  }

  window.addEventListener('keydown', onGlobalKeyDown);

  const stopLoop = startLoop({
    renderer,
    scene,
    camera,
    update(delta) {
      const dt = delta > 1 ? delta / 1000 : delta;
      const elapsed = performance.now() * 0.001;

      if (player && !gameEnded) {
        player.update(dt, input.state);

        if (input.state.run && (input.state.forward || input.state.left || input.state.right)) {
          bacLevel = Math.min(0.35, bacLevel + dt * 0.004);
          hud.setSoberLevel(bacLevel);
        }

        if (echoPulse > 0) {
          echoPulse = Math.max(0, echoPulse - dt * 0.65);
          const waveRadius = 1 + (1 - echoPulse) * 14;
          echoWaveMesh.scale.setScalar(waveRadius);
          echoWaveMat.opacity = echoPulse * 0.65;
          if (echoPulse === 0) echoWaveMesh.visible = false;
        }

        lighting.update(player.model.position, bacLevel, echoPulse, elapsed);
      }

      controls.update();

      if (!gameEnded) {
        const swayIntensity = (bacLevel - 0.1) * 0.18;
        camera.rotation.z += Math.sin(elapsed * 1.45) * swayIntensity;
      }

      const telemetry = rockBand?.getTelemetry();
      const isPlaying = telemetry?.isPlaying ?? false;
      performancePhase = isPlaying ? 'playing' : hasStartedOnce ? 'post' : 'pre';

      pub.update(elapsed, telemetry?.kickPulse ?? 0);

      const grooveBoost = isPlaying ? 1 + (telemetry?.kickPulse ?? 0) * 0.22 : 1;
      for (const musician of musicians) {
        musician.setPhase(performancePhase);
        musician.update(dt * grooveBoost);
      }

      crowdController?.update(dt, isPlaying);

      if (girlfriendMixer) {
        girlfriendMixer.update(dt * (isPlaying ? 1.15 : 0.85));
      }

      if (player && !gameEnded) {
        interactions.update(player.model.position, (target) => {
          if (target) {
            const alreadyChecked = approachedIds.has(target.id);
            hud.setActionPrompt(
              alreadyChecked ? 'JÁ VERIFICADO' : '[E] ABORDAR PESSOA  •  [Q] ECOAR'
            );
            targetRing.visible = true;
            targetRingMat.color.setHex(alreadyChecked ? 0x64748b : 0xf43f5e);
          } else {
            hud.setActionPrompt(null);
            targetRing.visible = false;
          }
        });

        const activeTarget = interactions.getActiveTarget();
        if (activeTarget && targetRing.visible) {
          targetRing.position.set(
            activeTarget.object.position.x,
            0.01,
            activeTarget.object.position.z
          );
          const pulse = 1 + Math.sin(elapsed * 6) * 0.08;
          targetRing.scale.set(pulse, pulse, 1);
        }
      }

      if (drumKitGroup) {
        const kick = telemetry?.kickPulse ?? 0;
        drumKitGroup.scale.set(1 + kick * 0.015, 1 - kick * 0.012, 1 + kick * 0.015);
      }

      const audioBoost = (telemetry?.bassEnergy ?? 0) * 0.6 + (telemetry?.snarePulse ?? 0) * 0.8;
      for (const entry of stageLights) {
        entry.light.intensity = entry.baseIntensity * (1 + audioBoost);
      }

      colliders.update(camera);
    }
  });

  let loadedCount = 0;
  const totalSteps = 9 + ACTIVE_CROWD_COUNT;
  const stepProgress = (label: string) => ui.setProgress(label, ++loadedCount, totalSteps);

  async function loadAsset<T>(label: string, task: () => Promise<T>): Promise<T | null> {
    try {
      const res = await task();
      stepProgress(label);
      return res;
    } catch (error) {
      stepProgress(label);
      console.error(`[SHOWTIME] Falha ao carregar ${label}:`, error);
      return null;
    }
  }

  async function loadSceneAssets(): Promise<void> {
    const randomSpot = HIDING_SPOTS[Math.floor(Math.random() * HIDING_SPOTS.length)];

    const [
      loadedPlayer,
      drummer,
      bassist,
      guitarist,
      girlfriend,
      drumKit,
      bass,
      guitar
    ] = await Promise.all([
      loadAsset('Protagonista', () => createPlayer(scene, camera, controls, colliders)),
      loadAsset('Baterista', () =>
        loadMusician('/assets/characters/drummer.fbx', 1.8, {
          preFbxUrl: '/assets/characters/drummer_Sitting.fbx',
          postFbxUrl: '/assets/characters/drummer_Sitting.fbx'
        })
      ),
      loadAsset('Baixista', () =>
        loadMusician('/assets/characters/bassist.fbx', 1.8, {
          preFbxUrl: '/assets/characters/bassist_Standing.fbx',
          postFbxUrl: '/assets/characters/bassist_Ready.fbx'
        })
      ),
      loadAsset('Guitarrista', () =>
        loadMusician('/assets/characters/guitarist.fbx', 1.8, {
          postFbxUrl: '/assets/characters/guitarist_Defeated.fbx'
        })
      ),
      loadAsset('Namorada', () => loadMusician('/assets/characters/girlfriend.fbx', 1.72)),
      loadAsset('Bateria', () => loadInstrument('/assets/instruments/drum-kit.glb', 2.4)),
      loadAsset('Baixo', () => loadInstrument('/assets/instruments/bass.glb', 1.05)),
      loadAsset('Guitarra', () => loadInstrument('/assets/instruments/guitar.glb', 0.95))
    ]);

    player = loadedPlayer;

    if (drummer) {
      drummer.model.position.set(-0.32, 0.68, -3.02);
      attachRockDrumsticks(drummer.model);
      scene.add(drummer.model);
      musicians.push(drummer);
      colliders.register('Baterista', drummer.model, true);
    }

    if (bassist) {
      bassist.model.position.set(-3, 0.5, -3.5);
      scene.add(bassist.model);
      musicians.push(bassist);
      colliders.register('Baixista', bassist.model, true);
    }

    if (guitarist) {
      guitarist.model.position.set(3, 0.5, -3.5);
      scene.add(guitarist.model);
      musicians.push(guitarist);
      colliders.register('Guitarrista', guitarist.model, true);
    }

    crowdController = await createCrowd(scene, stepProgress);
    for (const extraModel of crowdController.models) {
      colliders.register(extraModel.name, extraModel, true);
      interactions.register({
        id: extraModel.name,
        object: extraModel,
        isGirlfriend: false
      });
    }

    if (girlfriend) {
      girlfriend.model.position.set(randomSpot.pos[0], randomSpot.pos[1], randomSpot.pos[2]);
      girlfriend.model.rotation.y = randomSpot.rotY;
      scene.add(girlfriend.model);
      musicians.push(girlfriend);
      girlfriendGroup = girlfriend.model;
      girlfriendSpotlight.position.set(randomSpot.pos[0], 2.8, randomSpot.pos[2]);
      colliders.register('Namorada', girlfriend.model, true);
      interactions.register({
        id: 'Namorada',
        object: girlfriend.model,
        isGirlfriend: true
      });

      loadAnimationClip('/assets/characters/Dancing.fbx')
        .then((clip) => {
          stepProgress('Namorada dançando');
          if (!clip || !girlfriendGroup) return;
          const idx = musicians.indexOf(girlfriend);
          if (idx !== -1) musicians.splice(idx, 1);
          girlfriendMixer = new THREE.AnimationMixer(girlfriendGroup);
          girlfriendMixer.clipAction(clip).play();
        })
        .catch(() => stepProgress('Namorada dançando'));
    } else {
      stepProgress('Namorada dançando');
    }

    if (drumKit) {
      drumKit.position.set(0, 0.5, -2.4);
      scene.add(drumKit);
      drumKitGroup = drumKit;
      colliders.register('Bateria', drumKit, false);
    }

    if (bass) {
      if (bassist) {
        attachToMusician(bass, bassist.model, 'BAIXO', {
          position: [0.06, -0.12, 0.25],
          rotation: [0.1, Math.PI - 0.2, 2.0],
          scale: 0.9
        });
      } else {
        bass.position.set(-2.5, 0.5, -2.2);
        scene.add(bass);
      }
    }

    if (guitar) {
      if (guitarist) {
        attachToMusician(guitar, guitarist.model, 'GUITARRA', {
          position: [0.06, -0.18, 0.25],
          rotation: [0.1, -0.2, -1.15],
          scale: 0.9
        });
      } else {
        guitar.position.set(2.5, 0.5, -2.2);
        scene.add(guitar);
      }
    }

    ui.hideLoading();
    hud.update('Pressione [Q] para chamar por ela ou [E] para abordar alguém próximo.', 5000);
  }

  function resize(): void {
    const width = appContainer.clientWidth;
    const height = appContainer.clientHeight;
    if (width <= 0 || height <= 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  resize();
  window.addEventListener('resize', resize);
  void loadSceneAssets();

  window.addEventListener(
    'pagehide',
    () => {
      stopLoop();
      void rockBand?.dispose();
      player?.dispose();
      crowdController?.dispose();
      input.dispose();
      pub.dispose();
      targetRingGeo.dispose();
      targetRingMat.dispose();
      echoWaveGeo.dispose();
      echoWaveMat.dispose();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onGlobalKeyDown);
      ui.dispose();
      controls.dispose();
      hud.destroy();
      renderer.dispose();
    },
    { once: true }
  );
}
