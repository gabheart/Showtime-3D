
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(container: HTMLElement): THREE.PerspectiveCamera {
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);

  const camera = new THREE.PerspectiveCamera(
    55,
    width / height,
    0.1,
    200
  );

  camera.position.set(0, 5, 12);
  camera.lookAt(0, 1.2, -2);

  return camera;
}

export function createCameraControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);

  controls.target.set(0, 1.2, -2);

  // Rotação com botão esquerdo.
  controls.enableRotate = true;

  // Zoom com scroll.
  controls.enableZoom = true;

  // Movimento lateral com botão direito.
  controls.enablePan = true;

  controls.minDistance = 3;
  controls.maxDistance = 35;

  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI * 0.48;

  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;

  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  controls.update();

  return controls;
}

