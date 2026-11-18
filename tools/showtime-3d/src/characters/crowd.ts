import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { loadAnimationClip } from './musician';

export interface CrowdMemberSpec {
  id: string;
  modelUrl: string;
  animUrl: string;
  height: number;
  position: [number, number, number];
  rotationY: number;
}

export interface CrowdController {
  models: THREE.Group[];
  update: (delta: number, isBandPlaying: boolean) => void;
  dispose: () => void;
}

const fbxLoader = new FBXLoader();

export const ACTIVE_CROWD_COUNT = 3;

const CROWD_ROSTER: CrowdMemberSpec[] = [
  {
    id: 'Figurante_1',
    modelUrl: '/assets/characters/extra1_anim.fbx',
    animUrl: '/assets/characters/extra1_anim.fbx',
    height: 1.75,
    position: [-2.2, -0.02, 1.3],
    rotationY: 2.95
  },
  {
    id: 'Figurante_2',
    modelUrl: '/assets/characters/extra2_anim.fbx',
    animUrl: '/assets/characters/extra2_anim.fbx',
    height: 1.78,
    position: [1.7, -0.02, 1.4],
    rotationY: -2.85
  },
  {
    id: 'Figurante_3',
    modelUrl: '/assets/characters/extra3_anim.fbx',
    animUrl: '/assets/characters/extra3_anim.fbx',
    height: 1.70,
    position: [-1.1, -0.02, 2.7],
    rotationY: 3.10
  }
];

function normalizeSkeleton(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Bone) {
      obj.name = obj.name.replace(/mixamorig\d*[:_]?/gi, 'mixamorig');
    }
  });
}

function normalizeAndStripClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const clean = clip.clone();
  for (const track of clean.tracks) {
    track.name = track.name.replace(/mixamorig\d*[:_]?/gi, 'mixamorig');
  }
  clean.tracks = clean.tracks.filter((t) => !t.name.endsWith('.position'));
  return clean;
}

async function spawnSingleExtra(
  spec: CrowdMemberSpec,
  scene: THREE.Scene
): Promise<{ model: THREE.Group; mixer: THREE.AnimationMixer; speedFactor: number } | null> {
  try {
    const model = await fbxLoader.loadAsync(encodeURI(spec.modelUrl));
    normalizeSkeleton(model);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(spec.height / (size.y || 1));

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

    model.position.set(spec.position[0], spec.position[1], spec.position[2]);
    model.rotation.y = spec.rotationY;
    model.name = spec.id;

    // Se o FBX já trouxe a animação embutida (With Skin), usa direto sem carregar 2x
    const rawClip =
      spec.modelUrl === spec.animUrl && model.animations.length > 0
        ? model.animations[0]
        : await loadAnimationClip(encodeURI(spec.animUrl));

    const mixer = new THREE.AnimationMixer(model);

    if (rawClip) {
      const safeClip = normalizeAndStripClip(rawClip);
      mixer.clipAction(safeClip).play();
      mixer.update(0.016);
    }

    scene.add(model);
    return { model, mixer, speedFactor: 0.9 + Math.random() * 0.2 };
  } catch (err) {
    console.error(`[CROWD] Erro ao carregar ${spec.id}:`, err);
    return null;
  }
}

export async function createCrowd(
  scene: THREE.Scene,
  onStep?: (label: string) => void
): Promise<CrowdController> {
  const activeSpecs = CROWD_ROSTER.slice(0, ACTIVE_CROWD_COUNT);
  const entries: Array<{ model: THREE.Group; mixer: THREE.AnimationMixer; speedFactor: number }> = [];

  for (const spec of activeSpecs) {
    const entry = await spawnSingleExtra(spec, scene);
    onStep?.(spec.id);
    if (entry) entries.push(entry);
  }

  return {
    models: entries.map((e) => e.model),
    update(delta, isBandPlaying) {
      const pace = isBandPlaying ? 1.15 : 0.85;
      for (const e of entries) e.mixer.update(delta * pace * e.speedFactor);
    },
    dispose() {
      for (const e of entries) {
        e.mixer.stopAllAction();
        scene.remove(e.model);
      }
    }
  };
}
