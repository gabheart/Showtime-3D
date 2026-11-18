import * as THREE from 'three';

export interface LightingController {
  update: (
    playerPos: THREE.Vector3,
    bacLevel: number,
    echoPulse: number,
    elapsed: number
  ) => void;
}

export function createLighting(scene: THREE.Scene): LightingController {
  // Névoa espessa de casa de show enfumaçada (esconde os cantos distantes)
  const fog = new THREE.FogExp2(0x05020a, 0.135);
  scene.fog = fog;
  scene.background = new THREE.Color(0x040208);

  // Luz ambiente mínima: silhuetas mal aparecem no fundo escuro
  const ambient = new THREE.HemisphereLight(0x3b2d5e, 0x07040c, 0.24);
  scene.add(ambient);

  // Luz principal muito fraca apenas para manter projeção de sombra sutil
  const mainLight = new THREE.DirectionalLight(0x8b9cf6, 0.22);
  mainLight.position.set(1.5, 9.5, 6.5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  mainLight.shadow.bias = -0.0005;
  mainLight.shadow.camera.near = 1;
  mainLight.shadow.camera.far = 22;
  mainLight.shadow.camera.left = -9;
  mainLight.shadow.camera.right = 9;
  mainLight.shadow.camera.top = 9;
  mainLight.shadow.camera.bottom = -9;
  scene.add(mainLight);

  // Holofotes dramáticos APENAS no palco (criam contraste forte com o salão escuro)
  const drummerSpot = new THREE.SpotLight(0x38bdf8, 34, 13, Math.PI / 6, 0.65, 1.8);
  drummerSpot.position.set(0, 5.2, -1.2);
  drummerSpot.target.position.set(0, 0.7, -2.9);
  scene.add(drummerSpot, drummerSpot.target);

  const bassistSpot = new THREE.SpotLight(0xf43f5e, 28, 12, Math.PI / 6.5, 0.7, 1.8);
  bassistSpot.position.set(-3.2, 5.0, -1.4);
  bassistSpot.target.position.set(-3.0, 1.1, -3.5);
  scene.add(bassistSpot, bassistSpot.target);

  const guitaristSpot = new THREE.SpotLight(0xf59e0b, 28, 12, Math.PI / 6.5, 0.7, 1.8);
  guitaristSpot.position.set(3.2, 5.0, -1.4);
  guitaristSpot.target.position.set(3.0, 1.1, -3.5);
  scene.add(guitaristSpot, guitaristSpot.target);

  // Contra-luz roxa recortando a banda no fundo do palco
  const backRimLight = new THREE.PointLight(0x9333ea, 18, 10, 1.8);
  backRimLight.position.set(0, 3.6, -5.4);
  scene.add(backRimLight);

  // Luzes de canto bem baixas (apenas pontos de referência espacial no breu)
  const pubWarmLight = new THREE.PointLight(0xd97706, 3.2, 7.5, 2.0);
  pubWarmLight.position.set(-5.6, 2.8, 3.4);
  scene.add(pubWarmLight);

  const pubCoolLight = new THREE.PointLight(0x0284c7, 2.8, 7.5, 2.0);
  pubCoolLight.position.set(5.6, 2.8, 3.4);
  scene.add(pubCoolLight);

  // Luz de percepção do protagonista (raio curto ao redor do Remy)
  const playerVisionLight = new THREE.PointLight(0xe2e8f0, 4.2, 5.2, 1.9);
  playerVisionLight.position.set(0, 1.8, 4.2);
  scene.add(playerVisionLight);

  return {
    update(playerPos, bacLevel, echoPulse, elapsed) {
      // Acompanha o Remy suavemente
      playerVisionLight.position.set(playerPos.x, 1.75, playerPos.z);

      // Quanto maior o álcool (BAC), menor o alcance da visão e mais densa a névoa
      const drunkenness = THREE.MathUtils.clamp((bacLevel - 0.15) / 0.2, 0, 1);
      const baseDistance = THREE.MathUtils.lerp(5.4, 2.9, drunkenness);
      const baseIntensity = THREE.MathUtils.lerp(4.6, 2.2, drunkenness);

      // Quando aperta [Q] (echoPulse > 0), expande temporariamente o campo de visão
      playerVisionLight.distance = baseDistance + echoPulse * 5.5;
      playerVisionLight.intensity =
        baseIntensity + echoPulse * 7.0 + Math.sin(elapsed * 4.5) * 0.25;

      // Névoa fecha conforme você fica mais bêbado, mas abre brevemente no Eco
      const targetFogDensity = THREE.MathUtils.lerp(0.13, 0.21, drunkenness) - echoPulse * 0.045;
      fog.density = THREE.MathUtils.lerp(fog.density, Math.max(0.07, targetFogDensity), 0.12);
    }
  };
}
