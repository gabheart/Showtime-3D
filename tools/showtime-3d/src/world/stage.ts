import * as THREE from 'three';

export function createStage(): THREE.Group {
  const stage = new THREE.Group();
  stage.name = 'Stage';

  // 1. Plataforma principal (mantém exatamente 10 x 0.5 x 5 em y=0.25, z=-3 para preservar Y=0.5 dos músicos)
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.5, 5),
    new THREE.MeshStandardMaterial({
      color: 0x1b1c24,
      roughness: 0.55,
      metalness: 0.25
    })
  );
  platform.position.set(0, 0.25, -3);
  platform.receiveShadow = true;
  platform.castShadow = true;
  stage.add(platform);

  // Rodapé metálico escuro da plataforma
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(10.08, 0.12, 5.08),
    new THREE.MeshStandardMaterial({
      color: 0x0e0f14,
      roughness: 0.4,
      metalness: 0.8
    })
  );
  trim.position.set(0, 0.06, -3);
  stage.add(trim);

  // 2. Faixas de LED Neon (frente e laterais do palco)
  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00b8d4,
    emissiveIntensity: 2.4,
    roughness: 0.2
  });

  const frontLight = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 0.06, 0.06),
    neonCyanMat
  );
  frontLight.position.set(0, 0.51, -0.49);
  stage.add(frontLight);

  const sideLightGeo = new THREE.BoxGeometry(0.06, 0.06, 4.9);
  const leftEdgeLight = new THREE.Mesh(sideLightGeo, neonCyanMat);
  leftEdgeLight.position.set(-4.99, 0.51, -3);
  stage.add(leftEdgeLight);

  const rightEdgeLight = new THREE.Mesh(sideLightGeo, neonCyanMat);
  rightEdgeLight.position.set(4.99, 0.51, -3);
  stage.add(rightEdgeLight);

  // 3. Tapete circular da bateria no centro do palco (y = 0.502)
  const drumRug = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 0.012, 36),
    new THREE.MeshStandardMaterial({
      color: 0x2b121d,
      roughness: 0.95
    })
  );
  drumRug.position.set(0, 0.506, -2.6);
  drumRug.receiveShadow = true;
  stage.add(drumRug);

  const rugBorder = new THREE.Mesh(
    new THREE.RingGeometry(1.48, 1.55, 36),
    new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0x881337,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide
    })
  );
  rugBorder.rotation.x = -Math.PI / 2;
  rugBorder.position.set(0, 0.514, -2.6);
  stage.add(rugBorder);

  // 4. Degraus de acesso na lateral direita do palco
  const stepMat = new THREE.MeshStandardMaterial({
    color: 0x16171f,
    roughness: 0.6,
    metalness: 0.4
  });

  for (let i = 0; i < 2; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.16, 0.45),
      stepMat
    );
    step.position.set(4.1, 0.08 + i * 0.16, -0.25 - i * 0.25);
    step.castShadow = true;
    step.receiveShadow = true;
    stage.add(step);
  }

  // 5. Monitores de retorno de palco (cunhas inclinadas na borda frontal)
  const speakerMat = new THREE.MeshStandardMaterial({
    color: 0x111217,
    roughness: 0.75,
    metalness: 0.2
  });
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x262936,
    roughness: 0.5,
    metalness: 0.5
  });

  const wedgePositions = [-3.1, -1.2, 1.2, 3.1];
  for (const x of wedgePositions) {
    const wedge = new THREE.Group();
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.26, 0.42),
      speakerMat
    );
    cabinet.rotation.x = -0.35;
    cabinet.castShadow = true;
    wedge.add(cabinet);

    const grille = new THREE.Mesh(
      new THREE.PlaneGeometry(0.54, 0.2),
      coneMat
    );
    grille.position.set(0, 0.06, -0.19);
    grille.rotation.set(-Math.PI / 2 - 0.35, 0, 0);
    wedge.add(grille);

    wedge.position.set(x, 0.61, -0.82);
    stage.add(wedge);
  }

  // 6. Torres de PA / Amplificadores laterais no fundo do palco
  const ampPositions = [-4.15, 4.15];
  for (const x of ampPositions) {
    const stack = new THREE.Group();

    const bottomCab = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.95, 0.55),
      speakerMat
    );
    bottomCab.position.y = 0.475;
    bottomCab.castShadow = true;
    bottomCab.receiveShadow = true;
    stack.add(bottomCab);

    const headAmp = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.32, 0.48),
      new THREE.MeshStandardMaterial({
        color: 0x1d202b,
        roughness: 0.4,
        metalness: 0.7
      })
    );
    headAmp.position.y = 1.11;
    headAmp.castShadow = true;
    stack.add(headAmp);

    // LED indicador no cabeçote do amplificador
    const powerLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.03, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 2
      })
    );
    powerLed.position.set(0, 1.11, 0.245);
    stack.add(powerLed);

    stack.position.set(x, 0.5, -4.6);
    stack.rotation.y = x < 0 ? 0.22 : -0.22;
    stage.add(stack);
  }

  // 7. Estrutura metálica (Truss / Treliça) superior com refletores Par-Can
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x383c4a,
    roughness: 0.35,
    metalness: 0.85
  });

  const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.2, 12);
  const leftPillar = new THREE.Mesh(pillarGeo, trussMat);
  leftPillar.position.set(-4.75, 2.6, -5.2);
  leftPillar.castShadow = true;
  stage.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, trussMat);
  rightPillar.position.set(4.75, 2.6, -5.2);
  rightPillar.castShadow = true;
  stage.add(rightPillar);

  const topBeam = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 0.22, 0.22),
    trussMat
  );
  topBeam.position.set(0, 4.65, -5.2);
  topBeam.castShadow = true;
  stage.add(topBeam);

  // Refletores visuais pendurados na treliça
  const canColors = [0x00e5ff, 0xf43f5e, 0xf59e0b, 0xa855f7, 0x00e5ff];
  const canXs = [-3.4, -1.7, 0, 1.7, 3.4];

  canXs.forEach((x, idx) => {
    const canGroup = new THREE.Group();
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.28, 14),
      speakerMat
    );
    housing.rotation.x = Math.PI / 3.2;
    canGroup.add(housing);

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.125, 14),
      new THREE.MeshStandardMaterial({
        color: canColors[idx],
        emissive: canColors[idx],
        emissiveIntensity: 3
      })
    );
    lens.position.set(0, -0.08, 0.12);
    lens.rotation.x = Math.PI / 3.2;
    canGroup.add(lens);

    canGroup.position.set(x, 4.42, -5.12);
    stage.add(canGroup);
  });

  return stage;
}
