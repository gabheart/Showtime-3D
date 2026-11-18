
#!/usr/bin/env bash
set -euo pipefail

PROJECT="showtime-3d"

echo "=== SHOWTIME-3D :: BOOTSTRAP ==="

mkdir -p "$PROJECT"
cd "$PROJECT"

# Estrutura TypeScript
mkdir -p public/assets/{characters,animations,instruments}
mkdir -p src/{core,world,characters,crowd,audio,ui}
mkdir -p rust/crowd-engine/src

# Package
cat > package.json <<'EOF'
{
  "name": "showtime-3d",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.180.0"
  },
  "devDependencies": {
    "@types/three": "^0.180.0",
    "typescript": "~5.9.0",
    "vite": "^7.0.0"
  }
}
EOF

# TypeScript
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
EOF

# HTML
cat > index.html <<'EOF'
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SHOWTIME-3D</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
EOF

# Rust
cat > rust/crowd-engine/Cargo.toml <<'EOF'
[package]
name = "crowd-engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
EOF

cat > rust/crowd-engine/src/lib.rs <<'EOF'
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct CrowdEngine {
    count: usize,
    time: f32,
    energy: f32,
}

#[wasm_bindgen]
impl CrowdEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(count: usize) -> CrowdEngine {
        CrowdEngine {
            count,
            time: 0.0,
            energy: 0.0,
        }
    }

    pub fn update(
        &mut self,
        delta: f32,
        energy: f32,
    ) {
        self.time += delta;
        self.energy = energy.clamp(0.0, 1.0);
    }

    pub fn get_x(&self, index: usize) -> f32 {
        let angle = index as f32 * 2.399963;
        let radius = 4.0 + (index as f32 * 0.17).sin() * 3.0;

        radius * angle.cos()
    }

    pub fn get_z(&self, index: usize) -> f32 {
        let angle = index as f32 * 2.399963;
        let radius = 4.0 + (index as f32 * 0.17).sin() * 3.0;

        radius * angle.sin()
    }

    pub fn get_y(&self, index: usize) -> f32 {
        let phase = self.time * (3.0 + self.energy * 5.0)
            + index as f32 * 0.7;

        phase.sin() * (0.08 + self.energy * 0.3)
    }

    pub fn count(&self) -> usize {
        self.count
    }
}
EOF

# Diretórios funcionais
for file in \
  src/core/engine.ts \
  src/core/renderer.ts \
  src/core/camera.ts \
  src/core/loop.ts \
  src/world/pub.ts \
  src/world/stage.ts \
  src/world/bar.ts \
  src/world/dancefloor.ts \
  src/world/lighting.ts \
  src/characters/musician.ts \
  src/characters/animation.ts \
  src/characters/instruments.ts \
  src/crowd/crowd.ts \
  src/crowd/instances.ts \
  src/crowd/crowd-wasm.ts \
  src/audio/audio-engine.ts \
  src/audio/analyzer.ts \
  src/audio/beat-detector.ts \
  src/ui/hud.ts
do
  touch "$file"
done

cat > src/main.ts <<'EOF'
import './style.css';
import { createShowtime } from './core/engine';

createShowtime();
EOF

cat > src/style.css <<'EOF'
* {
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #08080d;
}

canvas {
  display: block;
}
EOF

echo "Instalando dependências..."
npm install

echo "=== ESTRUTURA CRIADA ==="
echo "Próximo passo: implementar o motor 3D."

