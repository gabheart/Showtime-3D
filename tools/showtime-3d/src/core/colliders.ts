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

  refreshDynamic(): void {
    for (const collider of this.colliders) {
      if (collider.dynamic) collider.box.setFromObject(collider.object);
    }
  }

  /**
   * Impede o personagem jogável (Remy) de atravessar palco, NPCs e limites do pub.
   */
  resolveCharacter(position: THREE.Vector3, radius = 0.38, ignoreObject?: THREE.Object3D): void {
    this.refreshDynamic();

    // Limites internos aproximados do pub
    position.x = THREE.MathUtils.clamp(position.x, -6.6, 6.6);
    position.z = THREE.MathUtils.clamp(position.z, -4.6, 6.4);

    const sphereCenter = new THREE.Vector3(position.x, 0.9, position.z);
    const sphere = new THREE.Sphere(sphereCenter, radius);

    for (const collider of this.colliders) {
      if (ignoreObject && collider.object === ignoreObject) continue;

      if (collider.box.intersectsSphere(sphere)) {
        const closest = new THREE.Vector3();
        collider.box.clampPoint(sphereCenter, closest);
        const push = new THREE.Vector3(
          sphereCenter.x - closest.x,
          0,
          sphereCenter.z - closest.z
        );

        if (push.lengthSq() > 0.00001) {
          push.normalize();
          position.x = closest.x + push.x * (radius + 0.01);
          position.z = closest.z + push.z * (radius + 0.01);
          sphereCenter.set(position.x, 0.9, position.z);
        }
      }
    }
  }

  update(camera: THREE.Camera): void {
    if (camera.position.y < 0.75) camera.position.y = 0.75;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -6.8, 6.8);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -4.8, 6.8);
  }
}
