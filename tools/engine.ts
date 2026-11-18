
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
  loadMusician,
  type LoadedMusician
} from '../characters/musician';

import { attachInstrument } from '../characters/instruments';

// ======================================================
// SHOWTIME-3D | ENGINE
// MVP 01 — Sala de ensaio com três músicos Mixamo
// ======================================================

const ASSETS = {
  guitarist: '/assets/characters/guitarist.fbx',
  bassist: '/assets/characters/bassist.fbx',
  drummer: '/assets/characters/drummer.fbx',

  guitar: '/assets/instruments/guitar.glb',
  bass: '/assets/instruments/bass.glb',
  drumKit: '/assets/instruments/drum-kit.glb'
};

const CONFIG = {
  room: {
    width: 18,
    depth: 14,
    height: 6
  },

  camera: {
    position: new THREE.Vector3(0, 4.5, 12),
    target: new THREE.Vector3(0, 1.4, -1)
  },

  musicians: [
    {
      name: 'Guitarrista',
      file: ASSETS.guitarist,
      position: new THREE.Vector3(-3.5, 0, -2.5),
      rotationY: 0
    },
    {
      name: 'Baixista',
      file: ASSETS.bassist,
      position: new THREE.Vector3(0, 0, -2.5),
      rotationY: 0
    },
    {
      name: 'Baterista',
      file: ASSETS.drummer,
      position: new THREE.Vector3(3.5, 0, -2.5),
      rotationY: 0
    }
  ]
};

// ======================================================
// MATERIALS
// ======================================================

function createMaterial(
  color: number,
  roughness = 0.8,
  metalness = 0.1,
  emissive = 0x000000
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: 0.8
  });
}

// ======================================================
// PROCEDURAL GEOMETRY
// ======================================================

function createBox(
  scene: THREE.Scene,
  width: number,
  height: number,
  depth: number,
  position: THREE.Vector3,
  material: THREE.Material
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );

  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);

  return mesh;
}

// ======================================================
// ROOM
// ======================================================

function createRoom(scene: THREE.Scene) {
  const { width, depth, height } = CONFIG.room;

  const floorMaterial = createMaterial(0x39332e);
  const wallMaterial = createMaterial(0x292d38);
  const ceilingMaterial = createMaterial(0x171922);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    floorMaterial
  );

  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  scene.add(floor);

  // Back wall
  createBox(
    scene,
    width,
    height,
    0.3,
    new THREE.Vector3(0, height / 2, -depth / 2),
    wallMaterial
  );

  // Left wall
  createBox(
    scene,
    0.3,
    height,
    depth,
    new THREE.Vector3(-width / 2, height / 2, 0),
    wallMaterial
  );

  // Right wall
  createBox(
    scene,
    0.3,
    height,
    depth,
    new THREE.Vector3(width / 2, height / 2, 0),
    wallMaterial
  );

  // Ceiling
  createBox(
    scene,
    width,
    0.2,
    depth,
    new THREE.Vector3(0, height, 0),
    ceilingMaterial
  );

  // Rear acoustic panels
  const panelMaterial = createMaterial(0x41414e);

  for (let i = 0; i < 7; i++) {
    createBox(
      scene,
      1.5,
      2.5,
      0.08,
      new THREE.Vector3(-6 + i * 2, 3, -6.78),
      panelMaterial
    );
  }

  // Carpet / rehearsal area
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 7),
    createMaterial(0x282532)
  );

  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.015, -2.5);

  scene.add(carpet);

  // Stage markers
  const markerColors = [
    0x00d9ff,
    0xffb000,
    0xff36a5
  ];

  for (let i = 0; i < 3; i++) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.06, 0.08),
      createMaterial(
        markerColors[i],
        0.3,
        0.2,
        markerColors[i]
      )
    );

    marker.position.set(-3.5 + i * 3.5, 0.04, -5.7);

    scene.add(marker);
  }

  console.info('[WORLD] Sala procedural criada');
}

// ======================================================
// LIGHTING
// ======================================================

function createLighting(scene: THREE.Scene) {
  // Ambient illumination
  const hemisphere = new THREE.HemisphereLight(
    0xc5d6ff,
    0x29202a,
    2
  );

  scene.add(hemisphere);

  // Main spotlight
  const mainLight = new THREE.SpotLight(
    0xffffff,
    100,
    30,
    Math.PI / 4,
    0.5
  );

  mainLight.position.set(0, 5.5, 2);
  mainLight.target.position.set(0, 0, -2);

  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);

  scene.add(mainLight);
  scene.add(mainLight.target);

  // Colored lights
  const colors = [
    0x00d9ff,
    0xffb000,
    0xff36a5
  ];

  for (let i = 0; i < colors.length; i++) {
    const light = new THREE.PointLight(
      colors[i],
      18,
      9
    );

    light.position.set(-3.5 + i * 3.5, 3.5, -3);

    scene.add(light);
  }

  // Rear light
  const backLight = new THREE.PointLight(
    0x854cff,
    30,
    14
  );

  backLight.position.set(0, 4, -6);

  scene.add(backLight);

  console.info('[LIGHTING] Iluminação configurada');
}

// ======================================================
// DRUM KIT
// Instrumento independente do esqueleto
// ======================================================

async function loadDrumKit(
  scene: THREE.Scene,
  position: THREE.Vector3
) {
  const loader = new GLTFLoader();

  const gltf = await loader.loadAsync(ASSETS.drumKit);

  const drumKit = gltf.scene;

  drumKit.name = 'DrumKit';

  // Normalizar dimensão máxima para 2.5 unidades
  drumKit.updateMatrixWorld(true);

  const initialBounds = new THREE.Box3().setFromObject(drumKit);
  const size = initialBounds.getSize(new THREE.Vector3());

  const maxDimension = Math.max(size.x, size.y, size.z);

  if (maxDimension <= 0) {
    throw new Error('Drum kit com dimensões inválidas');
  }

  drumKit.scale.setScalar(2.5 / maxDimension);
  drumKit.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(drumKit);

  drumKit.position.set(
    position.x,
    position.y - bounds.min.y,
    position.z
  );

  drumKit.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  scene.add(drumKit);

  console.info('[INSTRUMENT] Drum kit carregado');

  return drumKit;
}

// ======================================================
// MUSICIANS
// ======================================================

async function loadBand(
  scene: THREE.Scene
): Promise<LoadedMusician[]> {

  const musicians: LoadedMusician[] = [];

  const results = await Promise.allSettled(
    CONFIG.musicians.map((config) =>
      loadMusician(scene, config)
    )
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      musicians.push(result.value);

      console.info(
        `[BAND] ${result.value.name} pronto`
      );
    } else {
      console.error(
        `[BAND] Falha em ${CONFIG.musicians[index].name}`,
        result.reason
      );
    }
  });

  return musicians;
}

// ======================================================
// INSTRUMENTS
// Guitarra e baixo: attachment provisório ao Spine2
// ======================================================

async function loadBandInstruments(
  musicians: LoadedMusician[]
) {
  const guitarist = musicians.find(
    musician => musician.name === 'Guitarrista'
  );

  const bassist = musicians.find(
    musician => musician.name === 'Baixista'
  );

  const tasks: Promise<unknown>[] = [];

  if (guitarist) {
    tasks.push(
      attachInstrument(guitarist, {
        name: 'Guitar',
        file: ASSETS.guitar,
        bone: 'Spine2',
        position: [0, -0.15, 0.25],
        rotation: [0, 0, 0],
        scale: 0.5
      })
    );
  }

  if (bassist) {
    tasks.push(
      attachInstrument(bassist, {
        name: 'Bass',
        file: ASSETS.bass,
        bone: 'Spine2',
        position: [0, -0.15, 0.25],
        rotation: [0, 0, 0],
        scale: 0.5
      })
    );
  }

  const results = await Promise.allSettled(tasks);

  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(
        '[INSTRUMENT] Falha no attachment:',
        result.reason
      );
    }
  });
}

// ======================================================
// MAIN ENGINE
// ======================================================

export async function createShowtime() {
  const app = document.querySelector<HTMLDivElement>('#app');

  if (!app) {
    throw new Error('Elemento #app não encontrado');
  }

  // SCENE
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x11131a);
  scene.fog = new THREE.Fog(0x11131a, 22, 40);

  // CAMERA
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  camera.position.copy(CONFIG.camera.position);

  // RENDERER
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.75)
  );

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  app.replaceChildren(renderer.domElement);

  // CAMERA CONTROLS
  const controls = new OrbitControls(
    camera,
    renderer.domElement
  );

  controls.target.copy(CONFIG.camera.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  controls.minDistance = 3;
  controls.maxDistance = 18;

  controls.maxPolarAngle = Math.PI * 0.48;

  // WORLD
  createRoom(scene);
  createLighting(scene);

  // ANIMATION
  const clock = new THREE.Clock();

  const mixers: THREE.AnimationMixer[] = [];

  let running = true;

  function animate() {
    if (!running) return;

    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    for (const mixer of mixers) {
      mixer.update(delta);
    }

    controls.update();

    renderer.render(scene, camera);
  }

  animate();

  // LOAD MUSICIANS
  console.info('[SHOWTIME] Carregando banda...');

  const musicians = await loadBand(scene);

  for (const musician of musicians) {
    mixers.push(musician.mixer);
  }

  // LOAD INSTRUMENTS
  await loadBandInstruments(musicians);

  // LOAD DRUM KIT
  try {
    await loadDrumKit(
      scene,
      new THREE.Vector3(3.5, 0, -4)
    );
  } catch (error) {
    console.error(
      '[INSTRUMENT] Falha ao carregar bateria:',
      error
    );
  }

  // RESIZE
  function handleResize() {
    camera.aspect =
      window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }

  window.addEventListener('resize', handleResize);

  console.info('================================');
  console.info(' SHOWTIME-3D');
  console.info(' Sala de ensaio inicializada');
  console.info(` Músicos: ${musicians.length}/3`);
  console.info('================================');

  return {
    scene,
    camera,
    renderer,
    controls,
    musicians,
    mixers,

    dispose() {
      running = false;

      window.removeEventListener(
        'resize',
        handleResize
      );

      controls.dispose();

      for (const mixer of mixers) {
        mixer.stopAllAction();
      }

      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

