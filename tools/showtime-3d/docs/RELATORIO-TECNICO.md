# Relatório Técnico — Showtime 3D

**Projeto:** Showtime 3D — *Não Espere Muito do Fim do Mundo*
**Unidade Curricular:** Manutenção Evolutiva, Arquitetura de Software, Integração Nativa e Observabilidade
**Data da análise:** 18/11/2026
**Escopo:** conhecer o sistema, a estrutura de pastas e as linguagens usadas, levantar bugs e propor pontos de melhoria.

---

## 1. O que é o sistema

O Showtime 3D é um jogo 3D que roda no navegador. O jogador controla o Remy, um rapaz que bebeu demais durante um show num pub e perdeu a namorada na multidão. Ele tem **3 minutos** para encontrá-la entre os figurantes, enquanto uma banda de rock toca ao vivo no palco.

Cada pessoa abordada errada custa tempo e deixa o personagem mais embriagado. Mais álcool deixa a névoa mais densa, a visão mais curta e a câmera balançando mais.

### Mecânicas implementadas

| Tecla | Ação | Onde está no código |
|---|---|---|
| `W A S D` / setas | Andar (com cambaleio) | `src/player/player.ts` |
| `SHIFT` | Correr (aumenta o nível de álcool) | `src/core/engine.ts:302` |
| `E` | Abordar a pessoa próxima | `src/core/engine.ts:212` |
| `Q` | "Ecoar": chamar por ela. Custa 8 s e +álcool, mostra a direção dela e tem recarga de 7 s | `src/core/engine.ts:224` |
| `ESPAÇO` | Liga/desliga a banda (música procedural) | `src/core/engine.ts:281` |
| `R` | Reinicia (recarrega a página) | `src/player/input.ts:64` |
| `ENTER` / `ESC` | Fecha a introdução | `src/ui/hud.ts:144` |
| `F2` / `F8` | Painel de telemetria e exportação em JSON *(adicionados nesta manutenção)* | `src/core/profiler.ts` |

### Desfechos possíveis

1. **Vitória:** encontrar a namorada. Ganha uma nota de `RANK S`, `A` ou `B`, conforme os erros e o tempo restante.
2. **Derrota por erros:** abordar 3 estranhos faz o personagem ser retirado pelos seguranças.
3. **Derrota por tempo:** o cronômetro de 3 minutos zera.

> **Diferença em relação ao enunciado.** O enunciado da Situação de Aprendizagem descreve música no estilo Debussy, sistema de diálogos `[1][2][3]`, insights filosóficos a cada 45 s e um mecanismo de beber água no bar. **Nada disso existe no código atual:**
> - A música é uma banda de rock (Am–F–C–G, 116 BPM).
> - O arquivo `src/world/bar.ts` está vazio.
> - Não há diálogos nem insights.
>
> O relatório descreve o sistema **como ele é de fato**.

---

## 2. Como executar

**Pré-requisitos:** Node.js 22 e npm.

```bash
cd tools/showtime-3d
npm install
npm run dev        # abre em http://localhost:5173
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) com recarga automática |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`). **Resultado atual: 0 erros** |
| `npm run build` | Build de produção em `dist/` |
| `npm run tauri:build` | Gera o executável nativo (exige Rust e um linker; ver seção 9) |

---

## 3. Estrutura de pastas

```
simulador/
├── acoustic-guitar.glb          ← modelo solto fora do projeto (não usado)
└── tools/
    ├── bootstrap.sh             ← script Bash que criou o esqueleto do projeto
    ├── engine.ts, pub.ts, ...   ← rascunhos ANTIGOS soltos (versão de 01:00, não usados)
    ├── public/assets/           ← cópia antiga de alguns modelos
    └── showtime-3d/             ← ★ PROJETO PRINCIPAL
        ├── index.html           ← página única que carrega o jogo
        ├── package.json         ← dependências e scripts npm
        ├── tsconfig.json        ← configuração do TypeScript (modo strict)
        ├── .gitignore
        ├── public/assets/       ← modelos 3D servidos como arquivos estáticos (658 MB)
        │   ├── characters/      ← 30 arquivos .fbx (personagens + animações Mixamo)
        │   │   └── Male Drunk Pack/  ← protagonista Remy + animações de bêbado
        │   ├── instruments/     ← 3 arquivos .glb (bateria, baixo, guitarra)
        │   └── animations/      ← vazia
        ├── src/                 ← código-fonte TypeScript
        │   ├── main.ts          ← ponto de entrada
        │   ├── style.css        ← estilos globais e tela de loading
        │   ├── core/            ← motor: engine, loop, renderer, câmera, colisão, telemetria
        │   ├── world/           ← cenário: pub, palco, iluminação
        │   ├── characters/      ← carregamento de músicos, multidão, instrumentos
        │   ├── player/          ← protagonista, teclado, sistema de abordagem
        │   ├── audio/           ← síntese musical procedural (Web Audio API)
        │   ├── ui/              ← HUD, telas de loading, game over e vitória
        │   └── crowd/           ← vazia na prática (3 arquivos de 0 bytes)
        ├── src-tauri/           ← shell nativo em Rust (Tauri v2)
        │   ├── Cargo.toml       ← dependências Rust
        │   ├── tauri.conf.json  ← janela, CSP e empacotamento
        │   ├── capabilities/    ← permissões mínimas da janela
        │   ├── icons/
        │   └── src/             ← main.rs, telemetry.rs, security.rs
        ├── docs/                ← este relatório
        └── _backup_20261118_1549/ ← backup manual (ignorado pelo Git)
```

### Responsabilidade de cada módulo em `src/`

| Arquivo | Linhas | Responsabilidade |
|---|---:|---|
| `core/engine.ts` | 571 | **Orquestrador central.** Cria a cena, guarda o estado do jogo (álcool, erros, tempo), as regras de vitória/derrota, o loop de atualização, o carregamento de assets e o descarte. |
| `core/loop.ts` | 34 | Loop de animação com `requestAnimationFrame` e `delta` limitado a 50 ms |
| `core/renderer.ts` | 22 | Configura o `WebGLRenderer` (sombras, tone mapping ACES, sRGB) |
| `core/camera.ts` | 56 | Câmera em perspectiva + `OrbitControls` |
| `core/colliders.ts` | 65 | Colisão por caixas (`Box3`) × esfera do jogador e limites do pub |
| `core/profiler.ts` | 250 | *Novo.* Telemetria em tempo real (F2/F8) |
| `core/native-bridge.ts` | 76 | *Novo.* Envia a telemetria ao backend Rust quando roda dentro do Tauri |
| `world/pub.ts` | 441 | Pub procedural: piso, paredes de tijolo (texturas geradas em `<canvas>`), pista de dança, mesas |
| `world/stage.ts` | 234 | Palco, neons e tapete da bateria |
| `world/lighting.ts` | 91 | Holofotes, névoa e "luz de visão" que diminui com o álcool |
| `characters/musician.ts` | 161 | Carrega o FBX do músico e as animações pré, durante e pós-show |
| `characters/crowd.ts` | 149 | Carrega os 3 figurantes (`ACTIVE_CROWD_COUNT = 3`) |
| `characters/instruments.ts` | 71 | Carrega e normaliza os instrumentos `.glb` |
| `characters/attachments.ts` | 111 | Prende instrumentos e baquetas aos ossos das mãos |
| `player/player.ts` | 186 | Movimento do Remy relativo à câmera, cambaleio, animações |
| `player/input.ts` | 111 | Estado do teclado (WASD/Shift) e atalhos E/Q/R |
| `player/interactions.ts` | 45 | Encontra a pessoa mais próxima (raio de 1,65 m) |
| `audio/rock-band.ts` | 498 | Banda de rock **sintetizada**: bumbo, caixa, chimbal, baixo, guitarra com distorção, arpejo e reverb |
| `ui/hud.ts` | 307 | Introdução, barra superior (álcool e relógio), avisos de interação |
| `ui/overlays.ts` | 250 | Tela de loading com progresso, game over, flash de vitória, botão de som |

---

## 4. Linguagens e tecnologias: o que cada uma faz

| Linguagem / formato | Volume | Papel no sistema |
|---|---|---|
| **TypeScript** | 31 arquivos, ~3.900 linhas | Toda a lógica do jogo: cena 3D, regras, física simples, áudio e interface. O modo `strict` detecta erros de tipo antes de rodar. É convertido para JavaScript pelo Vite/esbuild. |
| **JavaScript** (gerado) | — | É o que o navegador executa de fato. Não há `.js` escrito à mão. |
| **HTML** | 1 arquivo | Só a "casca": o `<main id="app">` onde o canvas WebGL é inserido e a tag que carrega `main.ts`. Toda a interface é criada via DOM pelo TypeScript. |
| **CSS** | `style.css` (316 linhas) + estilos inline em TS | Visual da tela de loading, fontes, cores e animações (`@keyframes`). O HUD aplica estilos com `Object.assign(el.style, …)`. |
| **GLSL** (indireto) | — | Os shaders da GPU são gerados pelo Three.js a partir dos materiais (`MeshStandardMaterial`). O projeto não escreve shader próprio. |
| **Rust** | 3 arquivos, ~310 linhas | *Adicionado nesta manutenção.* Backend nativo do Tauri v2: gera o executável e grava a telemetria em disco de forma segura (validação com `serde` e bloqueio de *path traversal*). |
| **JSON** | `package.json`, `tsconfig.json`, `tauri.conf.json`, `capabilities/*.json` | Configuração: dependências, compilador TS, janela nativa, política de segurança (CSP) e permissões. |
| **TOML** | `Cargo.toml` | Dependências e perfil de compilação do Rust |
| **Bash** | `tools/bootstrap.sh` | Script que gerou o esqueleto inicial do projeto (pastas, `package.json`, `tsconfig`) |
| **FBX / GLB** | 30 `.fbx` + 3 `.glb` (658 MB) | Formatos de modelos 3D. FBX (Autodesk/Mixamo) para personagens com esqueleto e animação; GLB (glTF binário) para instrumentos. |

### Bibliotecas e APIs principais

| Tecnologia | Versão | Para que serve aqui |
|---|---|---|
| **Three.js** | 0.180 | Motor 3D: cena, câmera, luzes, sombras, `FBXLoader`, `GLTFLoader`, `AnimationMixer` |
| **Web Audio API** | nativa do navegador | Síntese da música em tempo real (osciladores, filtros, compressor, reverb por convolução, `AnalyserNode` para a luz pulsar com o bumbo) |
| **Vite** | 6 | Servidor de desenvolvimento e empacotador de produção |
| **Tauri** | 2 | Transforma o jogo web em executável nativo usando o WebView do sistema (WebView2 no Windows) |

---

## 5. Arquitetura e fluxo de execução

```
index.html
   └─ main.ts
        ├─ profiler.ts           (instala telemetria de áudio)
        └─ engine.ts → createShowtime()
              ├─ renderer, câmera, OrbitControls
              ├─ pub, palco, iluminação          (cenário procedural, imediato)
              ├─ HUD + overlays                 (interface DOM)
              ├─ startLoop(update)               ← roda a cada frame (~60 Hz)
              │     ├─ player.update      (movimento + colisão)
              │     ├─ lighting.update    (névoa/visão conforme álcool)
              │     ├─ músicos, multidão, namorada (AnimationMixer)
              │     ├─ interações         (quem está perto?)
              │     └─ luzes do palco pulsando com o áudio (FFT)
              └─ loadSceneAssets()               ← assíncrono, em paralelo
                    ├─ Remy + 4 animações
                    ├─ 3 músicos + namorada (FBX)
                    ├─ 3 instrumentos (GLB)
                    └─ 3 figurantes (em sequência)
```

O ponto central da arquitetura é que **`engine.ts` concentra quase tudo**: estado do jogo (`bacLevel`, `mistakesCount`, `gameEnded`), regras de negócio (ranking, punições), carregamento de assets, loop e descarte de recursos, numa única função de 570 linhas com closures. Isso é a principal dívida estrutural (seção 7).

---

## 6. Métricas medidas (baseline)

Medidas com o painel `[F2]` em `npm run dev`, Chrome/WebView2, notebook do laboratório, com a banda tocando:

| Métrica | Valor |
|---|---:|
| FPS médio | **56,9** |
| FPS 1% low | **8,5** (travadas durante o parse dos FBX na thread principal) |
| Frame time médio | 17,6 ms |
| Pior frame | 457 ms |
| Draw calls por frame | **104** (pico 109) |
| Triângulos | 340.476 |
| Geometrias na GPU | 88 |
| Texturas na GPU | 88 |
| Heap JS | 148 MB |
| AudioContext | `running`, 48.000 Hz, 262 nós conectados de 262 criados |

**Leitura dos números:** o FPS médio é bom, mas o **1% low de 8,5 FPS** mostra travamentos fortes. Eles acontecem porque o `FBXLoader` decodifica arquivos de até 31 MB na thread principal. Os 104 draw calls são altos para uma cena com só 8 personagens; a pista de dança sozinha gera 24 deles (bug B8).

---

## 7. Bugs encontrados

Severidade: 🔴 alta (quebra mecânica ou vaza recursos) · 🟠 média (comportamento errado visível) · 🟡 baixa (cosmético ou qualidade).

| # | Sev. | Local | Problema | Efeito para o jogador |
|---|:-:|---|---|---|
| **B1** | 🔴 | `engine.ts:86-107` + `rock-band.ts:160-183` | **Condição de corrida no play da música.** `toggleBand()` faz `await rockBand.start()`, e durante o `await context.resume()` o `timer` ainda é `null`. Um segundo `[ESPAÇO]` rápido passa na guarda `if (this.timer !== null)` e cria **dois `setInterval`**. Um deles fica órfão e nunca é parado. | Notas duplicadas e música "embolada". Ao pausar, um dos agendadores continua rodando: vazamento de timer. |
| **B2** | 🟠 | `engine.ts:150-158` e `376-378` × `lighting.ts:83` | **A luz de visão do álcool é sobrescrita.** O `scene.traverse` que monta `stageLights` captura também a `playerVisionLight`. No mesmo frame, `lighting.update()` define a intensidade conforme o álcool e o eco, e logo depois o loop das luzes do palco sobrescreve com `baseIntensity * (1 + audioBoost)`. | O efeito de "a visão escurece quando fica bêbado" e o clarão do `[Q]` **não funcionam** na intensidade. Só o alcance da luz muda. |
| **B3** | 🟠 | `rock-band.ts:205-219` | **Rajada de notas ao voltar à aba.** O agendador usa `setInterval` de 25 ms, que o navegador limita a 1 s em aba oculta. Ao voltar, `nextStepTime` está muito no passado e o `while` agenda **todas as notas atrasadas de uma vez**. | Barulho/explosão sonora ao trocar de aba e voltar. |
| **B4** | 🟠 | `hud.ts:248-257` | **O relógio não para na vitória.** O `clockInterval` só verifica `timeUpTriggered`; ao encontrar a namorada nada para o cronômetro. | O tempo continua descendo na tela de vitória. Ao zerar, chama `onTimeUp` (bloqueado por `gameEnded`, mas o relógio fica vermelho). |
| **B5** | 🔴 | `engine.ts:549-570`, `stage.ts` (sem `dispose`), `player.ts:181`, `crowd.ts:142` | **Vazamento de memória de GPU.** O descarte não libera geometrias, materiais e texturas dos FBX/GLB, nem as 30 malhas do palco, os `AnimationMixer` dos músicos e da namorada ou as luzes. `player.dispose()` e `crowd.dispose()` só removem da cena. | Hoje é mascarado porque `[R]` recarrega a página inteira. Qualquer reinício sem reload acumularia VRAM. |
| **B6** | 🟠 | `engine.ts:437` | **Sem fallback para o protagonista.** Se `Remy.fbx` falhar, `player` fica `null` e o jogo continua "rodando" sem personagem: não dá para andar nem abordar ninguém, só esperar o tempo acabar. | Jogo injogável sem mensagem de erro. |
| **B7** | 🟡 | `public/assets/characters/` | **Assets quebrados ou ausentes.** `guitarist_Defeated.fbx` (31 MB) está corrompido (`RangeError: Offset is outside the bounds of the DataView`). `Dancing.fbx` não existe: o Vite devolve o `index.html` e o loader acusa "Cannot find the version number". | O guitarrista não faz a pose de pós-show e a namorada não dança. O jogo continua, mas com 31 MB baixados à toa. |
| **B8** | 🟡 | `pub.ts:197` | **Um material por ladrilho.** A pista 6×4 cria **24 `MeshStandardMaterial`**, mas só existem 2 cores. | 24 draw calls e trocas de shader desnecessárias. Bastariam 2 materiais ou 1 `InstancedMesh`. |
| **B9** | 🟡 | `pub.ts:139-144` × `lighting.ts:14-16` × `engine.ts:49` | **Névoa e fundo configurados 3 vezes.** O `pub` define `fog` 0,032 ao ser adicionado, mas o `createLighting` roda logo depois e sobrescreve com 0,135. O `background` é definido em três lugares. | Código morto e confuso; quem editar a névoa do pub não verá efeito. |
| **B10** | 🟡 | `instruments.ts:12-40` | **Logs de depuração esquecidos.** Dois `traverse` imprimem **cada nó** de cada instrumento (inclusive com o rótulo errado `[DRUM KIT INSPECT]` para baixo e guitarra), com indentação quebrada. | Console poluído e custo extra no carregamento. |
| **B11** | 🟡 | `hud.ts:20` | **Fonte remota no HUD.** `@import` de `fonts.googleapis.com` (JetBrains Mono / Space Grotesk). | Offline ou no executável com CSP as fontes não carregam; o jogo usa as fontes do sistema. |
| **B12** | 🟡 | `input.ts:64-68`, `overlays.ts:161` | **`[R]` recarrega a página a qualquer momento**, até no meio da partida, sem confirmação. O `onRestart` existe, mas o engine nunca o passa. | Perda acidental da partida; reinício não determinístico (recarrega todos os 658 MB do cache). |
| **B13** | 🟡 | `engine.ts:296` | `const dt = delta > 1 ? delta / 1000 : delta;` é código morto: o `loop.ts` já limita `delta` a 0,05. | Nenhum; só confunde a leitura. |
| **B14** | 🟡 | `engine.ts:227` | A recarga do eco usa `performance.now()` (relógio real), não o tempo de jogo. | Inconsistente se um dia o jogo tiver pausa. |
| **B15** | 🟡 | `colliders.ts:35-42` | `resolveCharacter` cria `Vector3` e `Sphere` novos **a cada frame** e recalcula todas as caixas dinâmicas (`setFromObject`). | Pressão no coletor de lixo (micro-travadas). |
| **B16** | 🟡 | `musician.ts`, `player.ts:17`, `crowd.ts:20` | **Três instâncias de `FBXLoader` sem cache compartilhado** (`THREE.Cache` desligado). O `drummer_Sitting.fbx` é baixado e decodificado **duas vezes** (`engine.ts:416-417`). | Download e parse duplicados, piorando o 1% low. |

---

## 8. Dívida técnica (classificação do enunciado)

### 8.1 Dívida acidental (sujeira de repositório)
- **8 arquivos `.ts` vazios** (0 bytes) e não importados: `crowd/crowd.ts`, `crowd/crowd-wasm.ts`, `crowd/instances.ts`, `characters/animation.ts`, `audio/analyzer.ts`, `audio/audio-engine.ts`, `audio/beat-detector.ts` e `world/bar.ts`.
- **Arquivos duplicados:** `ui/attachments.ts` é cópia idêntica de `characters/attachments.ts`; `ui/colliders.ts` é uma versão antiga de `core/colliders.ts`. Nenhum dos dois é importado.
- **Pasta de backup dentro do projeto** (`_backup_20261118_1549/`) e **rascunhos soltos** em `tools/` (`engine.ts`, `pub.ts`, `musician.ts`, `instruments.ts`, `index.html`) com uma versão antiga do código.
- `acoustic-guitar.glb` solto na raiz, fora do projeto.
- **O projeto não era um repositório Git** e não tinha `tsconfig.json` nem `.gitignore` (o `npm run build` falhava).
- Assets quebrados ou ausentes (B7) e logs de depuração (B10).

### 8.2 Dívida estrutural (arquitetura)
- **`engine.ts` é um "God Object":** mistura estado de jogo, regras de pontuação, punições, carregamento, loop e descarte numa única closure de 570 linhas. Não dá para testar as regras sem WebGL.
- **Estado espalhado:** o tempo restante mora no HUD (`hud.ts`), enquanto álcool e erros moram no engine. A **interface é dona de uma regra de negócio** (o cronômetro e o `onTimeUp`).
- **Código repetido:** `normalizeSkeleton` e a configuração de materiais estão copiados em `player.ts`, `musician.ts` e `crowd.ts`.
- **Interface 100% em estilos inline** dentro do TypeScript (centenas de linhas de `Object.assign(el.style, …)`), em vez de CSS.
- Números mágicos sem nome (0,35 de álcool máximo, 25 s e 8 s de punição, 7 s de recarga, 110/60 s para os ranks).

### 8.3 Dívida de produção
- Vazamentos de GPU e de timers (B1, B5).
- Sem fallback robusto para assets (B6, B7) e decodificação pesada na thread principal (1% low de 8,5 FPS).
- **658 MB de assets**: um único FBX tem 31 MB. Não há compressão (Draco/Meshopt) nem conversão para GLB.
- Dependência de rede (fontes do Google, B11) e nenhuma `Content-Security-Policy` na versão web.
- Distribuição só via `vite` (servidor de desenvolvimento), sujeita ao *throttling* de aba (B3).

---

## 9. Pontos de melhoria (por prioridade)

### Prioridade 1 — corrigir bugs (baixo custo, alto impacto)
1. **B1:** marcar um estado `starting` em `RockBandAudio.start()` antes do `await` (ou guardar a `Promise` em andamento) para impedir dois agendadores.
2. **B2:** excluir a `playerVisionLight` da lista `stageLights`, ou deixar o `lighting.update` rodar *depois* do pulso das luzes.
3. **B3:** no `scheduler()`, se `nextStepTime < currentTime`, pular para `currentTime` em vez de agendar o atraso; e/ou pausar a banda no evento `visibilitychange`.
4. **B4:** expor `hud.stopClock()` e chamá-lo na vitória e na derrota.
5. **B6:** se o Remy falhar, mostrar uma tela de erro com "tentar novamente" em vez de seguir sem jogador.
6. **B7, B10, B11:** remover os assets quebrados das referências, apagar os logs de depuração e empacotar as fontes localmente.

### Prioridade 2 — desempenho
7. **Materiais compartilhados:** 2 materiais para a pista (ou `InstancedMesh`), indo de 24 para 1-2 draw calls (B8).
8. **Cache de carregamento:** um `LoadingManager` + `FBXLoader` únicos com `THREE.Cache.enabled = true`, para não baixar o mesmo arquivo duas vezes (B16).
9. **Converter FBX → GLB com compressão Draco/Meshopt.** Os 658 MB podem cair para menos de 100 MB e o parse fica mais rápido.
10. Reutilizar vetores em `colliders.ts` (B15) e recalcular caixas só de quem se moveu.

### Prioridade 3 — arquitetura
11. **Extrair `src/core/narrative-state.ts`:** um controlador de domínio puro (sem Three.js) com `bacLevel`, `mistakesCount`, `timeLeft`, `outcome` e as regras de ranking. O engine só lê o estado. Isso permite testes unitários das regras.
12. **Ciclo de vida determinístico:** uma função `disposeObject3D(root)` que percorre a cena e libera geometria, material e textura, mais `mixer.uncacheRoot()`. Com isso, o `[R]` pode reiniciar **sem recarregar a página** (B5, B12).
13. Unificar `normalizeSkeleton` e a configuração de materiais num utilitário comum.
14. Mover os estilos do HUD para CSS (classes) e deixar o TS só com a estrutura.

### Prioridade 4 — repositório e distribuição
15. Apagar os arquivos vazios e duplicados, a pasta de backup e os rascunhos soltos. Versionar no Git com commits semânticos (`fix:`, `perf:`, `refactor:`).
16. **Executável nativo com Tauri** (já iniciado, seção 10). Para compilar no Windows falta o linker: instalar o *Visual Studio Build Tools* (toolchain MSVC) ou o MinGW-w64 (fornece o `dlltool.exe` exigido pela toolchain GNU).

---

## 10. O que foi feito nesta manutenção

| Item | Situação |
|---|---|
| Projeto restaurado do backup para `showtime-3d/`, assets unificados em `public/assets/` | ✅ Feito |
| `tsconfig.json` e `.gitignore` criados (backups, `*.bak` e `dist/` ignorados) | ✅ Feito |
| Dependências instaladas; `tsc --noEmit` **com 0 erros** | ✅ Feito |
| Jogo rodando em `npm run dev` e testado (carregamento, música, HUD, interação) | ✅ Feito |
| **Telemetria `[F2]`** (`profiler.ts`): FPS médio, 1% low, frame time, draw calls, geometrias, texturas, heap e nós de áudio; exportação JSON com `[F8]` | ✅ Feito (só uma linha adicionada ao engine) |
| Fontes remotas retiradas do `index.html` (requisito offline) | ✅ Feito |
| Backend Rust/Tauri: comando `save_session_telemetry` com validação `serde`, proteção contra *path traversal* (`Path::components()`, bloqueio de `..` e lista branca `.glb/.fbx/.json/.log`), CSP restritiva e testes unitários | ✅ Escrito / ⚠️ **não compilado**: falta o `dlltool.exe` (linker) na máquina |
| Correção dos bugs B1–B16 | ⏸️ Não feita. Por decisão da equipe, nesta etapa o código do jogo não foi refatorado, só documentado |
| Executável `.exe` | ⏸️ Pendente (depende do linker) |

---

## 11. Conclusão

O Showtime 3D é um protótipo visualmente rico e **funcional**: carrega, roda a ~57 FPS e todas as mecânicas centrais (movimento, eco, abordagem, música procedural, 3 desfechos) funcionam. Os problemas estão concentrados em:

1. **um orquestrador gigante (`engine.ts`)** que mistura regra de negócio com renderização;
2. **ciclo de vida de recursos incompleto**, hoje escondido pelo "recarregar a página";
3. **assets pesados e frágeis** (658 MB, 2 arquivos quebrados, parse travando a thread principal);
4. **bugs pontuais de áudio e iluminação** (B1–B3) que afetam diretamente a experiência e são baratos de corrigir.

A ordem recomendada é: corrigir os bugs de prioridade 1, depois otimizar os assets e por fim extrair o estado narrativo e o descarte determinístico, para então empacotar o executável com Tauri.
