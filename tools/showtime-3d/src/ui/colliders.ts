import * as THREE from 'three';

interface SceneCollider {
  name: string;
  object: THREE.Object3D;
  box: THREE.Box3;
  dynamic: boolean;
}

export class ColliderSystem {
  private colliders: SceneCollider[] = [];

  register(name: string, object: THREE.Object3D, dynamic = false): void {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    this.colliders.push({ name, object, box, dynamic });
  }

  update(camera: THREE.Camera): void {
    for (const collider of this.colliders) {
      if (collider.dynamic) collider.box.setFromObject(collider.object);
    }

    if (camera.position.y < 0.65) camera.position.y = 0.65;

    const cameraSphere = new THREE.Sphere(camera.position, 0.35);
    for (const collider of this.colliders) {
      if (collider.name === 'Palco') continue;
      if (collider.box.intersectsSphere(cameraSphere)) {
        const closestPoint = new THREE.Vector3();
        collider.box.clampPoint(camera.position, closestPoint);
        const pushDir = camera.position.clone().sub(closestPoint);
        if (pushDir.lengthSq() > 0.0001) {
          pushDir.normalize();
          camera.position.copy(closestPoint).addScaledVector(pushDir, 0.36);
        }
      }
    }
  }
}
