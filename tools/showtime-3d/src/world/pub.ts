import * as THREE from 'three';

export interface DanceTileItem {
  material: THREE.MeshStandardMaterial;
  phase: number;
  baseIntensity: number;
}

export interface PubSceneData {
  group: THREE.Group;
  danceTiles: DanceTileItem[];
  update: (elapsedSeconds: number, kickPulse?: number) => void;
  dispose: () => void;
}

function createWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#140c10';
  ctx.fillRect(0, 0, 512, 512);

  const planks = 8;
  const plankH = 512 / planks;

  for (let i = 0; i < planks; i++) {
    const y = i * plankH;
    const shade = 22 + ((i * 13) % 14);
    ctx.fillStyle = `rgb(${shade + 10}, ${Math.floor(shade * 0.62)}, ${Math.floor(shade * 0.72)})`;
    ctx.fillRect(0, y + 2, 512, plankH - 3);

    ctx.strokeStyle = 'rgba(6, 2, 6, 0.45)';
    ctx.lineWidth = 1.6;
    for (let g = 0; g < 6; g++) {
      ctx.beginPath();
      const gy = y + 6 + g * 9;
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(170, gy + 4, 340, gy - 4, 512, gy);
      ctx.stroke();
    }

    const jointX = ((i * 173) % 420) + 40;
    ctx.fillStyle = '#090408';
    ctx.fillRect(jointX, y, 3, plankH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBrickTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 512;
  colorCanvas.height = 512;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#0d0912';
  cCtx.fillRect(0, 0, 512, 512);
  bCtx.fillStyle = '#181818';
  bCtx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const cols = 8;
  const rowH = 512 / rows;
  const colW = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offsetX;
      const y = r * rowH;

      const variation = ((r * 31 + c * 17) % 18) - 9;
      const red = Math.min(58, Math.max(26, 40 + variation));
      const green = Math.min(28, Math.max(12, 18 + Math.floor(variation * 0.4)));
      const blue = Math.min(44, Math.max(20, 30 + Math.floor(variation * 0.6)));

      cCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      cCtx.fillRect(x + 3, y + 3, colW - 6, rowH - 6);

      bCtx.fillStyle = '#d8d8d8';
      bCtx.fillRect(x + 3, y + 3, colW - 6, rowH - 6);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(5, 2.2);
  map.anisotropy = 4;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(5, 2.2);
  bumpMap.anisotropy = 4;

  return { map, bumpMap };
}

export function createPub(): PubSceneData {
  const pub = new THREE.Group();
  pub.name = 'PubEnvironment';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const woodTexture = createWoodFloorTexture();
  const { map: brickMap, bumpMap: brickBump } = createBrickTextures();
  textures.push(woodTexture, brickMap, brickBump);

  // Névoa misteriosa suave (mantém o palco visível e escurece apenas os cantos)
  pub.addEventListener('added', () => {
    if (pub.parent instanceof THREE.Scene) {
      pub.parent.background = new THREE.Color(0x06030a);
      pub.parent.fog = new THREE.FogExp2(0x09040f, 0.032);
    }
  });

  // 1. Piso sombrio de madeira envelhecida
  const floorGeo = trackGeo(new THREE.PlaneGeometry(24, 24));
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.28,
      metalness: 0.18
    })
  );

  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  pub.add(floor);

  // 2. Pista de dança hipnótica (carmesim apaixonado e violeta sombrio)
  const dancefloor = new THREE.Group();
  dancefloor.name = 'Dancefloor';

  const floorCenterZ = 2.8;
  const gridCols = 6;
  const gridRows = 4;
  const tileSize = 1.05;
  const gap = 0.06;
  const step = tileSize + gap;
  const totalW = gridCols * step + 0.24;
  const totalD = gridRows * step + 0.24;

  const frameGeo = trackGeo(new THREE.BoxGeometry(totalW, 0.024, totalD));
  const frameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0c0812,
      roughness: 0.25,
      metalness: 0.9
    })
  );

  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.set(0, -0.01, floorCenterZ);
  frameMesh.receiveShadow = true;
  dancefloor.add(frameMesh);

  const danceTiles: DanceTileItem[] = [];
  const tileGeo = trackGeo(new THREE.PlaneGeometry(tileSize, tileSize));

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const isCrimson = (r + c) % 2 === 0;
      const accent = isCrimson ? 0xe11d48 : 0x7e22ce;

      const tileMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: isCrimson ? 0x1f0710 : 0x150924,
          emissive: accent,
          emissiveIntensity: 0.24,
          roughness: 0.16,
          metalness: 0.45
        })
      );

      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(
        (c - (gridCols - 1) / 2) * step,
        0.003,
        floorCenterZ + (r - (gridRows - 1) / 2) * step
      );
      tile.receiveShadow = true;
      dancefloor.add(tile);

      danceTiles.push({
        material: tileMat,
        phase: r * 1.15 + c * 0.85,
        baseIntensity: 0.24
      });
    }
  }

  pub.add(dancefloor);

  // 3. Paredes de tijolos escuros
  const brickWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: brickMap,
      bumpMap: brickBump,
      bumpScale: 0.045,
      roughness: 0.88,
      metalness: 0.08
    })
  );

  const backWallGeo = trackGeo(new THREE.BoxGeometry(24, 8.5, 0.35));
  const backWall = new THREE.Mesh(backWallGeo, brickWallMat);
  backWall.position.set(0, 4.2, -9);
  backWall.receiveShadow = true;
  pub.add(backWall);

  const acousticGeo = trackGeo(new THREE.BoxGeometry(10.6, 5.2, 0.16));
  const acousticMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b0710,
      roughness: 0.96
    })
  );
  const acousticPanel = new THREE.Mesh(acousticGeo, acousticMat);
  acousticPanel.position.set(0, 3.0, -8.76);
  pub.add(acousticPanel);

  // Feixes de néon assimétricos e melancólicos
  const neonConfigs = [
    { hex: 0xe11d48, width: 8.6, y: 4.95, rotZ: -0.025 },
    { hex: 0x9333ea, width: 6.8, y: 4.35, rotZ: 0.03 },
    { hex: 0xbe123c, width: 4.9, y: 3.75, rotZ: -0.018 }
  ];
  neonConfigs.forEach((cfg) => {
    const stripGeo = trackGeo(new THREE.BoxGeometry(cfg.width, 0.04, 0.04));
    const stripMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.hex,
        emissive: cfg.hex,
        emissiveIntensity: 1.55
      })
    );
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, cfg.y, -8.64);
    strip.rotation.z = cfg.rotZ;
    pub.add(strip);
  });

  const sideWallGeo = trackGeo(new THREE.BoxGeometry(0.35, 8.5, 22));
  const leftWall = new THREE.Mesh(sideWallGeo, brickWallMat);
  leftWall.position.set(-12, 4.2, 1);
  leftWall.receiveShadow = true;
  pub.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, brickWallMat);
  rightWall.position.set(12, 4.2, 1);
  rightWall.receiveShadow = true;
  pub.add(rightWall);

  // 4. Vigas de madeira enegrecida + pilastras inclinadas, arandelas e espelhos sombrios
  const beamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x120a0e,
      roughness: 0.78
    })
  );
  const ceilingBeamGeo = trackGeo(new THREE.BoxGeometry(24, 0.38, 0.42));

  for (const z of [-6.5, -2.5, 1.5, 5.5]) {
    const ceilingBeam = new THREE.Mesh(ceilingBeamGeo, beamMat);
    ceilingBeam.position.set(0, 7.6, z);
    pub.add(ceilingBeam);
  }

  const pillarGeo = trackGeo(new THREE.BoxGeometry(0.55, 8.6, 0.65));
  const sconceGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.52, 0.14));
  const sconceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xbe123c,
      emissiveIntensity: 1.75
    })
  );

  const mirrorFrameGeo = trackGeo(new THREE.BoxGeometry(0.08, 2.2, 1.15));
  const mirrorGlassGeo = trackGeo(new THREE.PlaneGeometry(1.0, 2.04));
  const mirrorGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x160e24,
      emissive: 0x2e1065,
      emissiveIntensity: 0.25,
      roughness: 0.08,
      metalness: 0.95
    })
  );

  for (const side of [-1, 1]) {
    for (const z of [-6, -1, 4, 8.5]) {
      const pillar = new THREE.Mesh(pillarGeo, beamMat);
      pillar.position.set(side * 11.6, 4.2, z);
      pillar.rotation.z = side * 0.035;
      pub.add(pillar);

      const sconce = new THREE.Mesh(sconceGeo, sconceMat);
      sconce.position.set(side * 11.25, 3.2, z);
      pub.add(sconce);
    }

    for (const mz of [-3.5, 1.5]) {
      const frame = new THREE.Mesh(mirrorFrameGeo, beamMat);
      frame.position.set(side * 11.78, 2.5, mz);
      pub.add(frame);

      const glass = new THREE.Mesh(mirrorGlassGeo, mirrorGlassMat);
      glass.position.set(side * 11.73, 2.5, mz);
      glass.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
      pub.add(glass);
    }
  }

  // 5. Mesas bistrô escuras com velas vermelhas tremeluzentes
  const tableTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.28
    })
  );
  const metalBaseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x110e18,
      roughness: 0.35,
      metalness: 0.85
    })
  );

  const baseGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.36, 0.04, 18));
  const stemGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 1.02, 12));
  const topGeo = trackGeo(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24));
  const candleGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.042, 0.11, 10));

  const candleMaterials: THREE.MeshStandardMaterial[] = [];

  const tableCoords: Array<[number, number]> = [
    [-7.5, 1.2],
    [-8.2, 4.6],
    [7.5, 1.2],
    [8.2, 4.6]
  ];

  for (const [tx, tz] of tableCoords) {
    const table = new THREE.Group();

    const base = new THREE.Mesh(baseGeo, metalBaseMat);
    base.position.y = 0.02;
    table.add(base);

    const stem = new THREE.Mesh(stemGeo, metalBaseMat);
    stem.position.y = 0.52;
    stem.castShadow = true;
    table.add(stem);

    const top = new THREE.Mesh(topGeo, tableTopMat);
    top.position.y = 1.04;
    top.castShadow = true;
    top.receiveShadow = true;
    table.add(top);

    const candleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.9
      })
    );
    candleMaterials.push(candleMat);

    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(0.08, 1.12, -0.05);
    table.add(candle);

    table.position.set(tx, -0.02, tz);
    pub.add(table);
  }

  return {
    group: pub,
    danceTiles,
    update(elapsedSeconds: number, kickPulse = 0): void {
      const beatBoost = kickPulse * 0.36;

      for (let i = 0; i < danceTiles.length; i++) {
        const tile = danceTiles[i];
        const slowWave =
          0.5 + 0.5 * Math.sin(elapsedSeconds * 1.35 + tile.phase);
        const weirdPulse =
          0.5 + 0.5 * Math.cos(elapsedSeconds * 0.65 - tile.phase * 0.7);
        tile.material.emissiveIntensity =
          0.1 + slowWave * 0.34 + weirdPulse * 0.14 + beatBoost;
      }

      for (let i = 0; i < candleMaterials.length; i++) {
        const flicker =
          Math.sin(elapsedSeconds * 9.5 + i * 2.1) * 0.25 +
          Math.cos(elapsedSeconds * 15.3 + i * 1.4) * 0.15;
        candleMaterials[i].emissiveIntensity = 1.75 + flicker;
      }
    },
    dispose(): void {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    }
  };
}
