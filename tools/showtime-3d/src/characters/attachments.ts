import * as THREE from 'three';

export interface AttachOffset {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

function findBone(model: THREE.Object3D, pattern: RegExp): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  model.traverse((object) => {
    if (!found && object instanceof THREE.Bone && pattern.test(object.name)) {
      found = object;
    }
  });
  return found;
}

export function attachToMusician(
  instrument: THREE.Group,
  musician: THREE.Group,
  label: string,
  offset: AttachOffset = {}
): void {
  const anchorBone =
    findBone(musician, /mixamorig[:\d]*Spine2$/i) ??
    findBone(musician, /mixamorig[:\d]*Spine1$/i) ??
    findBone(musician, /mixamorig[:\d]*LeftHand$/i);
  if (!anchorBone) return;

  instrument.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(instrument);
  const center = box.getCenter(new THREE.Vector3());

  const centeredInstrument = new THREE.Group();
  centeredInstrument.name = `${label}_Centered`;
  centeredInstrument.add(instrument);
  instrument.position.sub(center);

  musician.updateMatrixWorld(true);
  anchorBone.updateWorldMatrix(true, false);

  const boneWorldScale = new THREE.Vector3();
  anchorBone.getWorldScale(boneWorldScale);
  const extraScale = offset.scale ?? 1;

  const mount = new THREE.Group();
  mount.name = `${label}_Mount`;
  anchorBone.add(mount);

  mount.scale.set(
    extraScale / (boneWorldScale.x || 1),
    extraScale / (boneWorldScale.y || 1),
    extraScale / (boneWorldScale.z || 1)
  );

  const [px, py, pz] = offset.position ?? [0.06, -0.1, 0.25];
  const [rx, ry, rz] = offset.rotation ?? [0.1, -0.2, -1.15];

  mount.position.set(
    px / (boneWorldScale.x || 1),
    py / (boneWorldScale.y || 1),
    pz / (boneWorldScale.z || 1)
  );
  mount.rotation.set(rx, ry, rz);
  mount.add(centeredInstrument);
  mount.updateMatrixWorld(true);
}

export function attachRockDrumsticks(musician: THREE.Group): void {
  const stickMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9935b, roughness: 0.4, metalness: 0.05
  });

  const hands = [
    { pattern: /mixamorig[:\d]*LeftHand$/i, label: 'LeftRockStick', side: 1 },
    { pattern: /mixamorig[:\d]*RightHand$/i, label: 'RightRockStick', side: -1 }
  ];

  musician.updateMatrixWorld(true);
  for (const hand of hands) {
    const bone = findBone(musician, hand.pattern);
    if (!bone) continue;

    bone.updateWorldMatrix(true, false);
    const boneScale = new THREE.Vector3();
    bone.getWorldScale(boneScale);

    const mount = new THREE.Group();
    mount.name = hand.label;
    bone.add(mount);
    mount.scale.set(
      1 / (boneScale.x || 1), 1 / (boneScale.y || 1), 1 / (boneScale.z || 1)
    );

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.009, 0.41, 12),
      stickMaterial
    );
    shaft.castShadow = true;

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 10), stickMaterial);
    tip.scale.set(1, 1.35, 1);
    tip.position.y = 0.21;
    shaft.add(tip);

    shaft.position.set(hand.side * 0.025, 0.09, 0.06);
    shaft.rotation.set(Math.PI / 3.2, 0, hand.side * -0.35);
    mount.add(shaft);
  }
}
