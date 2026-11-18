import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export async function loadInstrument(
  url: string,
  targetSize = 1.5
): Promise<THREE.Group> {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  console.group('[INSTRUMENTO] ' + url);

model.traverse((object) => {
  if (object.name) {
    console.log(
      object.type,
      object.name,
      object.position.toArray(),
      object.rotation.toArray()
    );
  }
});

console.groupEnd();

    console.group('[DRUM KIT INSPECT]');

model.traverse(object => {
  if (object.name) {
    console.log(
      object.type,
      object.name,
      'Position:',
      object.position.toArray()
    );
  }
});

console.groupEnd();

  let bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());

  const largestDimension = Math.max(size.x, size.y, size.z);

  if (largestDimension <= 0) {
    throw new Error(`Instrumento GLB sem dimensões válidas: ${url}`);
  }

  model.scale.multiplyScalar(targetSize / largestDimension);

  bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  const root = new THREE.Group();
  root.add(model);

  return root;
}
