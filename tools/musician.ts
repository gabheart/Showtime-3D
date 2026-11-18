
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const loader = new FBXLoader();

export interface MusicianConfig {
  name: string;
  file: string;
  position: THREE.Vector3;
  height?: number;
  rotationY?: number;
}

export interface LoadedMusician {
  name: string;
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  bones: Map<string, THREE.Bone>;
  animations: THREE.AnimationClip[];
}

function normalizeBoneName(name: string) {
  return name
    .toLowerCase()
    .replace(/mixamorig:?/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export async function loadMusician(
  scene: THREE.Scene,
  config: MusicianConfig
): Promise<LoadedMusician> {

  console.info(`[MUSICIAN] Carregando ${config.name}`);

  const model = await loader.loadAsync(config.file);

  model.name = config.name;

  // Diagnóstico das animações
  const animations = model.animations;

  if (animations.length === 0) {
    throw new Error(
      `${config.name}: FBX não contém animações incorporadas.`
    );
  }

  console.info(
    `[MUSICIAN] ${config.name}: ${animations.length} animação(ões)`
  );

  animations.forEach((clip, index) => {
    console.info(
      `  ${index}: ${clip.name} | ${clip.duration.toFixed(2)}s`
    );
  });

  // Normalização do modelo
  const initialBounds = new THREE.Box3().setFromObject(model);
  const initialSize = initialBounds.getSize(new THREE.Vector3());

  if (initialSize.y <= 0) {
    throw new Error(`${config.name}: altura inválida.`);
  }

  const targetHeight = config.height ?? 1.8;
  const scale = targetHeight / initialSize.y;

  model.scale.setScalar(scale);

  // Atualizar transformações antes de calcular limites
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);

  model.position.set(
    config.position.x,
    config.position.y - bounds.min.y,
    config.position.z
  );

  model.rotation.y = config.rotationY ?? 0;

  // Sombras
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  // Identificar ossos
  const bones = new Map<string, THREE.Bone>();

  model.traverse((object) => {
    if ((object as THREE.Bone).isBone) {
      const bone = object as THREE.Bone;
      const key = normalizeBoneName(bone.name);

      bones.set(key, bone);
    }
  });

  console.info(
    `[MUSICIAN] ${config.name}: ${bones.size} ossos identificados`
  );

  console.table(
    Array.from(bones.entries()).map(([key, bone]) => ({
      normalized: key,
      original: bone.name
    }))
  );

  scene.add(model);

  // AnimationMixer independente
  const mixer = new THREE.AnimationMixer(model);

  const clip = animations[0];
  const action = mixer.clipAction(clip);

  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();

  return {
    name: config.name,
    model,
    mixer,
    action,
    bones,
    animations
  };
}

export function getMusicianBone(
  musician: LoadedMusician,
  name: string
): THREE.Bone | undefined {
  return musician.bones.get(normalizeBoneName(name));
}

