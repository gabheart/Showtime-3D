import * as THREE from 'three';

export interface InteractablePerson {
  id: string;
  object: THREE.Object3D;
  isGirlfriend: boolean;
}

export class InteractionSystem {
  private targets: InteractablePerson[] = [];
  private currentClosest: InteractablePerson | null = null;
  private readonly radius = 1.65;

  register(person: InteractablePerson): void {
    this.targets.push(person);
  }

  getActiveTarget(): InteractablePerson | null {
    return this.currentClosest;
  }

  update(
    playerPos: THREE.Vector3,
    onPromptChange: (target: InteractablePerson | null) => void
  ): void {
    let closest: InteractablePerson | null = null;
    let bestDist = this.radius;

    for (const target of this.targets) {
      const dx = target.object.position.x - playerPos.x;
      const dz = target.object.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < bestDist) {
        bestDist = dist;
        closest = target;
      }
    }

    if (closest !== this.currentClosest) {
      this.currentClosest = closest;
      onPromptChange(closest);
    }
  }
}
