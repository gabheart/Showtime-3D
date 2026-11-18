
import * as THREE from 'three';

export function createPub(scene: THREE.Scene) {
  const box = (
    w: number, h: number, d: number,
    x: number, y: number, z: number,
    color: number,
    emissive = 0x000000
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness: 0.25,
        emissive,
        emissiveIntensity: 1
      })
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    return mesh;
  };

  // Piso principal
  box(30, 0.5, 30, 0, -0.25, 0, 0x17151e);

  // Paredes
  box(30, 8, 0.5, 0, 4, -15, 0x211a32);
  box(0.5, 8, 30, -15, 4, 0, 0x211a32);
  box(0.5, 8, 30, 15, 4, 0, 0x211a32);

  // Palco
  box(15, 1, 5, 0, 0.5, -10, 0x292333);

  // Fundo do palco
  box(15, 6, 0.4, 0, 3.5, -14.5, 0x17101f);

  // Bar
  box(10, 1.2, 2, 9, 1, -4, 0x4a2537);

  // Bancada superior
  box(10.4, 0.2, 2.2, 9, 1.7, -4, 0x17151e);

  // Prateleiras
  box(9, 3, 0.3, 9, 3.5, -14, 0x38213e);

  // Pista
  box(13, 0.08, 12, 0, 0.04, 3, 0x20203d, 0x171050);

  // Neon frontal do palco
  box(14, 0.12, 0.12, 0, 1.15, -7.4, 0x00e5ff, 0x00e5ff);

  // Neon do bar
  box(10, 0.12, 0.12, 9, 1.5, -2.9, 0xff28b8, 0xff28b8);

  // Luminárias do palco
  for (let i = 0; i < 5; i++) {
    const light = new THREE.PointLight(
      i % 2 ? 0xff28b8 : 0x00dfff,
      45, 16
    );

    light.position.set(-6 + i * 3, 5, -9);
    scene.add(light);
  }
}

