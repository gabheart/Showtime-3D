
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  LoadedMusician,
  getMusicianBone
} from './musician';

const loader = new GLTFLoader();

export interface InstrumentConfig {
  name: string;
  file: string;
  bone: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export async function attachInstrument(
  musician: LoadedMusician,
  config: InstrumentConfig
) {
  const gltf = await loader.loadAsync(config.file);

  const instrument = gltf.scene;
  instrument.name = config.name;

  const bone = getMusicianBone(musician, config.bone);

  if (!bone) {
    throw new Error(
      `${musician.name}: osso ${config.bone} não encontrado.`
    );
  }

  instrument.position.set(
    ...(config.position ?? [0, 0, 0])
  );

  instrument.rotation.set(
    ...(config.rotation ?? [0, 0, 0])
  );

  instrument.scale.setScalar(config.scale ?? 1);

  instrument.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  bone.add(instrument);

  console.info(
    `[INSTRUMENT] ${config.name} anexado em ${bone.name}`
  );

  return instrument;
}

