import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export type PerformancePhase = 'pre' | 'playing' | 'post';

export interface MusicianController {
  model: THREE.Group;
  clips: THREE.AnimationClip[];
  update: (delta: number) => void;
  setPhase: (phase: PerformancePhase) => void;
}

const fbxLoader = new FBXLoader();

/**
 * Normaliza prefixos de ossos do Mixamo (ex: mixamorig1Hips -> mixamorigHips)
 * para evitar T-Pose ao cruzar animações entre arquivos FBX diferentes.
 */
function normalizeMixamoClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const cloned = clip.clone();
  for (const track of cloned.tracks) {
    track.name = track.name.replace(/mixamorig\d*[:_]?/gi, 'mixamorig');
  }
  return cloned;
}

function normalizeMixamoSkeleton(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Bone) {
      obj.name = obj.name.replace(/mixamorig\d*[:_]?/gi, 'mixamorig');
    }
  });
}

function hasValidMotion(clip: THREE.AnimationClip): boolean {
  if (!clip.tracks || clip.tracks.length === 0) return false;
  return clip.tracks.some((track) => {
    const values = track.values;
    const stride = track.getValueSize();
    if (values.length <= stride) return false;

    for (let i = stride; i < values.length; i += stride) {
      for (let j = 0; j < stride; j++) {
        if (Math.abs(values[i + j] - values[j]) > 0.0005) {
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * Carrega apenas o AnimationClip de um FBX de ação (ex: Dancing.fbx, Hip Hop Dancing.fbx).
 */
export async function loadAnimationClip(
  fbxUrl: string
): Promise<THREE.AnimationClip | null> {
  try {
    const asset = await fbxLoader.loadAsync(fbxUrl);
    const rawClip =
      asset.animations.find(hasValidMotion) ?? asset.animations[0];
    if (!rawClip || rawClip.tracks.length === 0) return null;
    return normalizeMixamoClip(rawClip);
  } catch (err) {
    console.warn(`[SHOWTIME] Clipe não carregado (${fbxUrl}):`, err);
    return null;
  }
}

export async function loadMusician(
  playingFbxUrl: string,
  targetHeight = 1.8,
  options?: {
    preFbxUrl?: string;
    postFbxUrl?: string;
  }
): Promise<MusicianController> {
  const model = await fbxLoader.loadAsync(playingFbxUrl);
  normalizeMixamoSkeleton(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / (size.y || 1);
  model.scale.setScalar(scale);

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const m of mats) {
        if (m) {
          m.transparent = false;
          m.opacity = 1;
          m.depthWrite = true;
        }
      }
    }
  });

  const mixer = new THREE.AnimationMixer(model);

  const rawPlayClip =
    model.animations.find(hasValidMotion) ?? model.animations[0];
  const playClip = rawPlayClip ? normalizeMixamoClip(rawPlayClip) : null;
  const playAction = playClip ? mixer.clipAction(playClip) : null;

  const [preClip, postClip] = await Promise.all([
    options?.preFbxUrl ? loadAnimationClip(options.preFbxUrl) : Promise.resolve(null),
    options?.postFbxUrl ? loadAnimationClip(options.postFbxUrl) : Promise.resolve(null)
  ]);

  const preAction = preClip ? mixer.clipAction(preClip) : playAction;
  const postAction = postClip ? mixer.clipAction(postClip) : preAction;

  const actions: Record<PerformancePhase, THREE.AnimationAction | null> = {
    pre: preAction,
    playing: playAction,
    post: postAction
  };

  let currentPhase: PerformancePhase = 'pre';
  let activeAction = actions.pre;

  if (activeAction) {
    activeAction.reset().play();
    mixer.update(0.016);
  }

  const collectedClips: THREE.AnimationClip[] = [];
  if (playClip) collectedClips.push(playClip);
  if (preClip) collectedClips.push(preClip);
  if (postClip) collectedClips.push(postClip);

  return {
    model,
    clips: collectedClips,
    update(delta: number) {
      mixer.update(delta);
    },
    setPhase(nextPhase: PerformancePhase) {
      if (nextPhase === currentPhase) return;
      const nextAction = actions[nextPhase];
      if (!nextAction) return;

      currentPhase = nextPhase;

      if (activeAction && activeAction !== nextAction) {
        nextAction.reset().play();
        activeAction.crossFadeTo(nextAction, 0.45, true);
      } else if (!activeAction) {
        nextAction.reset().play();
      }

      activeAction = nextAction;
    }
  };
}
