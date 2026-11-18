import * as THREE from 'three';

interface LoopOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  update?: (delta: number) => void;
}

export function startLoop(options: LoopOptions): () => void {
  const clock = new THREE.Clock();

  let frameId = 0;
  let running = true;

  function animate(): void {
    if (!running) return;

    frameId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    options.update?.(delta);
    options.renderer.render(options.scene, options.camera);
  }

  animate();

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    clock.stop();
  };
}
