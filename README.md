# Showtime 3D — Bootstrap e Orquestração

O **Showtime 3D** é um projeto de ambiente tridimensional interativo desenvolvido com Three.js e TypeScript. Sua estrutura foi preparada para reunir cenário 3D, personagens, músicos, instrumentos, animações, efeitos sonoros e elementos de interface.

Este relatório apresenta o funcionamento do script `bootstrap.sh`, responsável por preparar a estrutura inicial do projeto, configurar as tecnologias utilizadas e organizar os módulos que serão desenvolvidos.

## Tecnologias utilizadas

| Tecnologia | Versão declarada | Finalidade |
|---|---:|---|
| Bash | — | Execução do script de inicialização. |
| Three.js | `^0.180.0` | Renderização e manipulação de objetos 3D. |
| TypeScript | `~5.9.0` | Desenvolvimento com tipagem estática. |
| Vite | `^7.0.0` | Servidor de desenvolvimento e geração da versão de produção. |
| `@types/three` | `^0.180.0` | Definições de tipos para o Three.js. |
| Rust | — | Preparação dos cálculos relacionados à multidão. |
| WebAssembly | — | Tecnologia prevista para uma futura integração entre Rust e JavaScript. |

## Bootstrap: preparação do projeto

O arquivo `bootstrap.sh` automatiza a configuração inicial do Showtime 3D. Entre suas tarefas estão:

- criar a pasta principal `showtime-3d`;
- gerar os diretórios para os módulos e recursos do projeto;
- criar arquivos de configuração do npm, TypeScript e HTML;
- preparar os arquivos iniciais em TypeScript e Rust;
- instalar as dependências JavaScript com `npm install`.

O Bootstrap prepara a infraestrutura de desenvolvimento, mas não implementa automaticamente todos os recursos do jogo.

### Estrutura criada

```text
showtime-3d/
├── public/
│   └── assets/
│       ├── characters/
│       ├── animations/
│       └── instruments/
├── src/
│   ├── core/
│   ├── world/
│   ├── characters/
│   ├── crowd/
│   ├── audio/
│   ├── ui/
│   ├── main.ts
│   └── style.css
├── rust/
│   └── crowd-engine/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
├── index.html
├── package.json
└── tsconfig.json
```

### Função dos diretórios

| Diretório | Responsabilidade |
|---|---|
| `src/core/` | Motor principal, renderização, câmera e loop de atualização. |
| `src/world/` | Elementos físicos e visuais do cenário. |
| `src/characters/` | Personagens, instrumentos e animações. |
| `src/crowd/` | Componentes relacionados aos figurantes. |
| `src/audio/` | Sistema de áudio e análise sonora. |
| `src/ui/` | Interface visual e informações do jogo. |
| `public/assets/` | Armazenamento de modelos, instrumentos e animações. |
| `rust/crowd-engine/` | Código Rust preparado para uso com WebAssembly. |

## Configurações e módulos preparados

### Dependências e comandos npm

O `package.json` declara as dependências e os comandos utilizados no projeto:

| Comando | Função |
|---|---|
| `npm run dev` | Inicia o ambiente de desenvolvimento. |
| `npm run build` | Executa a verificação TypeScript e a compilação de produção. |
| `npm run preview` | Permite visualizar a versão compilada. |

O Bootstrap executa `npm install` para instalar as dependências declaradas no `package.json`.

### TypeScript

O arquivo `tsconfig.json` é criado com as seguintes configurações principais:

- padrão de compilação ES2022;
- módulos ESNext;
- resolução de módulos compatível com ferramentas de empacotamento;
- verificação rigorosa de tipos (`strict: true`);
- `noEmit: true`, que impede a geração direta de arquivos JavaScript pelo TypeScript.

Assim, o TypeScript realiza a verificação do código e o Vite fica responsável pela geração dos arquivos destinados ao navegador.

### Entrada da aplicação

O arquivo `index.html` contém o elemento `div` com o identificador `app`, que funciona como ponto de montagem da aplicação. O arquivo `src/main.ts` importa o CSS e chama `createShowtime()`, que representa a entrada do motor principal.

**Atenção:** o Bootstrap cria inicialmente o arquivo `engine.ts` vazio. Portanto, a chamada `createShowtime()` depende da implementação posterior do motor para que a aplicação funcione.

### Motor tridimensional e cenário

O Bootstrap prepara arquivos destinados às seguintes responsabilidades:

| Módulo | Responsabilidade prevista |
|---|---|
| `engine.ts` | Coordenação central do sistema 3D. |
| `renderer.ts` | Configuração da renderização WebGL. |
| `camera.ts` | Controle e posicionamento da câmera. |
| `loop.ts` | Atualização contínua dos quadros. |
| `pub.ts` | Construção do ambiente da casa de shows. |
| `stage.ts` | Estrutura do palco. |
| `bar.ts` | Estrutura do bar. |
| `dancefloor.ts` | Área da pista de dança. |
| `lighting.ts` | Iluminação do cenário. |

Esses arquivos são criados como estrutura inicial. A implementação de cada componente deve acontecer posteriormente.

### Personagens, instrumentos e recursos

A estrutura inclui arquivos e diretórios destinados ao carregamento e gerenciamento de personagens, instrumentos e animações. Os recursos podem ser armazenados em `public/assets/`, incluindo modelos nos formatos FBX e GLB.

O Bootstrap cria os diretórios necessários, mas não realiza automaticamente o download desses modelos.

### Sistema de áudio

São preparados os arquivos:

- `audio-engine.ts`: implementação do sistema de áudio;
- `analyzer.ts`: análise de sinais sonoros;
- `beat-detector.ts`: detecção de batidas.

Esses módulos permitem desenvolver posteriormente funcionalidades como a sincronização de animações e efeitos visuais com a música.

### Rust e WebAssembly

O Bootstrap também prepara o módulo `crowd-engine`, escrito em Rust. O arquivo `Cargo.toml` declara o pacote e a dependência `wasm-bindgen`, utilizada para facilitar a comunicação entre Rust e JavaScript por meio de WebAssembly.

O arquivo `lib.rs` contém a estrutura `CrowdEngine`, com os seguintes elementos:

| Elemento | Função |
|---|---|
| `count` | Armazena a quantidade de integrantes da multidão. |
| `time` | Mantém o tempo acumulado da simulação. |
| `energy` | Representa o nível de energia utilizado nos movimentos. |
| `update()` | Atualiza o tempo e a energia. |
| `get_x()` | Calcula uma coordenada horizontal X. |
| `get_z()` | Calcula uma coordenada horizontal Z. |
| `get_y()` | Calcula uma oscilação vertical baseada no tempo e na energia. |

Essa estrutura prepara cálculos relacionados à movimentação dos figurantes. Entretanto, o Bootstrap não compila o módulo Rust para WebAssembly nem realiza sua integração automática com o Three.js.

## Fluxo de preparação

```text
bootstrap.sh
     ↓
Criação da estrutura de pastas
     ↓
Configuração do npm e do TypeScript
     ↓
Criação da entrada web (index.html e main.ts)
     ↓
Preparação dos módulos TypeScript e Rust
     ↓
npm install
     ↓
Estrutura inicial pronta para receber as implementações
```

## Bootstrap e Engine: qual é a diferença?

| Bootstrap | Engine |
|---|---|
| É executado para preparar o projeto. | Atua quando a aplicação é iniciada. |
| Cria diretórios e arquivos. | Gerencia os componentes do jogo. |
| Instala dependências. | Atualiza personagens e cenário. |
| Configura TypeScript e Vite. | Coordena renderização, áudio e interações. |
| Prepara a base do módulo Rust. | Pode integrar sistemas de multidão e animações. |
| Não renderiza o cenário. | Controla a experiência 3D em tempo real. |

Em resumo, o **Bootstrap prepara a infraestrutura** do Showtime 3D, enquanto a **Engine coordena o funcionamento do ambiente tridimensional** durante a execução.

## Pontos de atenção

A análise do `bootstrap.sh` identificou algumas limitações que devem ser consideradas:

- **Sobrescrita de configurações:** o script utiliza o redirecionamento `>` para criar arquivos como `package.json`, `index.html` e `main.ts`. Uma nova execução pode sobrescrever arquivos existentes.
- **Módulos inicialmente vazios:** os arquivos criados com `touch` não possuem implementação inicial. A execução do Bootstrap, por si só, não deixa o jogo pronto para funcionar.
- **Sem compilação Rust:** o código de `CrowdEngine` é preparado, mas não há uma etapa para compilá-lo em WebAssembly.
- **Dependências do ambiente:** a execução exige Bash, Node.js e npm disponíveis.
- **Diferença entre versões:** o Bootstrap analisado declara Vite 7, enquanto o log de compilação apresentado no material de análise utiliza Vite 6.4.6. Isso indica uma diferença entre as configurações examinadas, mas não permite concluir, isoladamente, que exista um erro.

## Contribuição dos integrantes

### Gabriel Borges
- Análise do script `bootstrap.sh` e das etapas de inicialização do projeto.
- Identificação da criação dos diretórios e da organização dos arquivos.
- Análise da estrutura geral do Showtime 3D e da preparação do ambiente.

### Paulo Felipe
- Pesquisa e descrição das configurações do projeto, incluindo npm e TypeScript.
- Análise da estrutura HTML e da relação entre Bootstrap e Engine.
- Elaboração e organização do README e das informações técnicas.

### Dérick Sales
- Análise dos módulos de personagens, multidão e sistema de áudio.
- Estudo da preparação do módulo Rust e de sua relação prevista com WebAssembly.
- Identificação das limitações técnicas e revisão das informações do projeto.

## Conclusão

O `bootstrap.sh` automatiza a configuração inicial do Showtime 3D, organizando diretórios, criando arquivos de configuração, preparando módulos TypeScript e Rust e instalando as dependências necessárias. Sua principal contribuição é reduzir o trabalho manual e estabelecer uma arquitetura modular para o desenvolvimento.

O script, porém, não substitui a Engine nem implementa automaticamente as funcionalidades do ambiente 3D. Ele deixa a estrutura preparada para que os componentes sejam desenvolvidos e integrados posteriormente.
