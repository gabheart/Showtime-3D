import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadAnimationClip } from '../characters/musician';
import type { PlayerInputState } from './input';
import type { ColliderSystem } from '../core/colliders';

type PlayerAnimState = 'idle' | 'walk' | 'run' | 'back';

export interface PlayerController {
  model: THREE.Group;
  update: (delta: number, input: PlayerInputState) => void;
  dispose: () => void;
}

const PACK_BASE = '/assets/characters/Male Drunk Pack';
const fbxLoader = new FBXLoader();

function normalizeSkeleton(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Bone) {
      obj.name = obj.name.replace(/mixamorig\d*[:_]?/gi, 'mixamorig');
    }
  });
}

function stripPositionTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
  const clean = clip.clone();
  clean.tracks = clean.tracks.filter((t) => !t.name.endsWith('.position'));
  return clean;
}

export async function createPlayer(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  colliders: ColliderSystem
): Promise<PlayerController> {
  const model = await fbxLoader.loadAsync(encodeURI(`${PACK_BASE}/Remy.fbx`));
  normalizeSkeleton(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(1.76 / (size.y || 1));

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m) {
          m.transparent = false;
          m.opacity = 1;
          m.depthWrite = true;
        }
      }
    }
  });

  // Posição inicial na pista, de costas para a entrada e olhando para o palco
  model.position.set(0, -0.02, 4.2);
  model.rotation.y = Math.PI;
  model.name = 'Player_Remy';
  scene.add(model);

  const [idleRaw, walkRaw, runRaw, backRaw] = await Promise.all([
    loadAnimationClip(encodeURI(`${PACK_BASE}/drunk idle.fbx`)),
    loadAnimationClip(encodeURI(`${PACK_BASE}/drunk walk.fbx`)),
    loadAnimationClip(encodeURI(`${PACK_BASE}/drunk run forward.fbx`)),
    loadAnimationClip(encodeURI(`${PACK_BASE}/drunk walk backwards.fbx`))
  ]);

  const mixer = new THREE.AnimationMixer(model);
  const actions: Partial<Record<PlayerAnimState, THREE.AnimationAction>> = {};

  if (idleRaw) actions.idle = mixer.clipAction(stripPositionTracks(idleRaw));
  if (walkRaw) actions.walk = mixer.clipAction(stripPositionTracks(walkRaw));
  if (runRaw) actions.run = mixer.clipAction(stripPositionTracks(runRaw));
  if (backRaw) actions.back = mixer.clipAction(stripPositionTracks(backRaw));

  let currentState: PlayerAnimState = 'idle';
  actions.idle?.play();
  mixer.update(0.016);

  function setAnimState(next: PlayerAnimState): void {
    if (next === currentState) return;
    const nextAction = actions[next] ?? actions.idle;
    const prevAction = actions[currentState];
    if (!nextAction) return;

    currentState = next;
    nextAction.reset().play();
    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, 0.25, true);
    }
  }

  // Configura câmera em 3ª pessoa seguindo o alvo
  controls.enablePan = false;
  controls.minDistance = 1.6;
  controls.maxDistance = 4.2;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(model.position.x, 1.35, model.position.z);
  camera.position.set(model.position.x, 2.05, model.position.z + 2.6);
  controls.update();

  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const moveDir = new THREE.Vector3();
  const prevPos = model.position.clone();
  let wobblePhase = 0;

  return {
    model,
    update(delta, input) {
      prevPos.copy(model.position);

      // Direção frontal baseada na câmera (no plano horizontal)
      camera.getWorldDirection(forwardVec);
      forwardVec.y = 0;
      if (forwardVec.lengthSq() < 0.0001) forwardVec.set(0, 0, -1);
      forwardVec.normalize();

      rightVec.crossVectors(forwardVec, THREE.Object3D.DEFAULT_UP).normalize();

      const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);

      moveDir.set(0, 0, 0);
      moveDir.addScaledVector(forwardVec, moveZ);
      moveDir.addScaledVector(rightVec, moveX);

      const isMoving = moveDir.lengthSq() > 0.001;

      if (isMoving) {
        moveDir.normalize();

        // Leve cambaleio lateral característico
        wobblePhase += delta * 3.4;
        const sway = Math.sin(wobblePhase) * 0.14;
        const perpX = -moveDir.z;
        const perpZ = moveDir.x;

        const isBackingOnly = moveZ < 0 && moveX === 0 && !input.run;
        const speed = input.run ? 3.1 : isBackingOnly ? 1.15 : 1.65;

        model.position.x += (moveDir.x + perpX * sway) * speed * delta;
        model.position.z += (moveDir.z + perpZ * sway) * speed * delta;

        // Rotaciona o personagem suavemente na direção do movimento
        const targetYaw = isBackingOnly
          ? Math.atan2(-moveDir.x, -moveDir.z)
          : Math.atan2(moveDir.x, moveDir.z);

        let diff = targetYaw - model.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        model.rotation.y += diff * Math.min(1, delta * 10);

        if (isBackingOnly) setAnimState('back');
        else if (input.run) setAnimState('run');
        else setAnimState('walk');
      } else {
        setAnimState('idle');
      }

      // Colisão com palco, paredes e figurantes
      colliders.resolveCharacter(model.position, 0.38, model);

      // Desloca câmera + alvo do OrbitControls pelo mesmo delta que o personagem andou
      const dx = model.position.x - prevPos.x;
      const dz = model.position.z - prevPos.z;
      camera.position.x += dx;
      camera.position.z += dz;
      controls.target.set(model.position.x, 1.35, model.position.z);

      mixer.update(delta);
    },
    dispose() {
      mixer.stopAllAction();
      scene.remove(model);
    }
  };
}
