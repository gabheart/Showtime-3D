# **Relatório técnico — Bootstrap e orquestração do Showtime 3D**

Alunos Paulo Felipe Santos de A. Batista, Gabriel Borges Santos, Derick Setubal


**Projeto:** [Showtime-3D — GitHub](https://github.com/gabheart/Showtime-3D.git?utm_source=chatgpt.com)\
**Tecnologias:** Bash, TypeScript, Three.js, Vite, Rust e WebAssembly\
**Tema:** Funcionamento do Bootstrap e os componentes que ele organiza e prepara.

## **1. Introdução**

O Showtime 3D é um projeto de ambiente tridimensional interativo desenvolvido com Three.js e TypeScript. Sua estrutura contempla a renderização de um cenário 3D, personagens, músicos, instrumentos, animações, efeitos sonoros e elementos de interface.

O arquivo `bootstrap.sh` funciona como um **script de inicialização e preparação do ambiente de desenvolvimento**.

Seu objetivo é automatizar a criação da estrutura básica do projeto, configurar as tecnologias necessárias, instalar dependências e preparar os diretórios para o desenvolvimento dos componentes.

É importante diferenciar duas responsabilidades:

- **Bootstrap:** prepara a estrutura e o ambiente necessários para desenvolver e executar o sistema.
- **Engine:** coordena o funcionamento do ambiente 3D durante a execução da aplicação.

O Bootstrap, portanto, não é responsável por executar continuamente as animações, movimentar personagens ou processar colisões. Essas atividades pertencem aos módulos do motor do jogo.

## **2. O que o Bootstrap faz?**

O script `bootstrap.sh` automatiza a preparação inicial do Showtime 3D. Ao ser executado, ele realiza uma sequência de operações para criar uma base organizada de desenvolvimento.

### **2.1 Criação do projeto**

O script define o nome do projeto:

```
PROJECT="showtime-3d"

mkdir -p "$PROJECT"
cd "$PROJECT"
```

Esses comandos criam a pasta principal e fazem com que as próximas operações aconteçam dentro dela.

O comando `mkdir -p` também evita erros quando o diretório já existe.

### **2.2 Criação dos diretórios**

O Bootstrap cria a seguinte estrutura:

**showtime-3d/**

ESTRUTURA GERADA PELO BOOTSTRAP

├── public/\
│   └── assets/\
│       ├── characters/\
│       ├── animations/\
│       └── instruments/\
├── src/\
│   ├── core/\
│   ├── world/\
│   ├── characters/\
│   ├── crowd/\
│   ├── audio/\
│   ├── ui/\
│   ├── main.ts\
│   └── style.css\
├── rust/\
│   └── crowd-engine/\
│       ├── Cargo.toml\
│       └── src/lib.rs\
├── index.html\
├── package.json\
└── tsconfig.json

Cada diretório possui uma responsabilidade:

| Diretório            | Função                                                       |
| -------------------- | ------------------------------------------------------------ |
| `core/`              | Motor principal, renderização, câmera e loop de atualização. |
| `world/`             | Elementos físicos e visuais do cenário.                      |
| `characters/`        | Personagens, instrumentos e animações.                       |
| `crowd/`             | Componentes relacionados aos figurantes.                     |
| `audio/`             | Sistema de áudio e análise sonora.                           |
| `ui/`                | Interface visual e informações do jogo.                      |
| `public/assets/`     | Armazenamento de modelos, instrumentos e animações.          |
| `rust/crowd-engine/` | Código Rust preparado para uso com WebAssembly.              |

## **3. Tudo que o Bootstrap está orquestrando**

FLUXO DE PREPARAÇÃO DO PROJETO

**bootstrap.sh**

Script Bash de inicialização

Estrutura de pastas

src, assets e rust

Configuração npm

package.json

Configuração TS

tsconfig.json

Entrada web

index.html e main.ts

Base Rust

Cargo.toml e lib.rs

Módulos do jogo

Arquivos TypeScript vazios

**npm install**

Instalação das dependências JavaScript

**Estrutura inicial preparada**

Aguardando implementação dos módulos

### **3.1 Gerenciamento de dependências**

O Bootstrap cria automaticamente o arquivo `package.json`, definindo as ferramentas utilizadas no desenvolvimento.

| Tecnologia   | Versão definida | Finalidade                                                   |
| ------------ | --------------- | ------------------------------------------------------------ |
| Three.js     | `^0.180.0`      | Renderização e manipulação de objetos 3D.                    |
| TypeScript   | `~5.9.0`        | Desenvolvimento com tipagem estática.                        |
| Vite         | `^7.0.0`        | Servidor de desenvolvimento e geração da versão de produção. |
| @types/three | `^0.180.0`      | Definições de tipos para Three.js.                           |

O script também configura três comandos npm:

- `npm run dev`: inicia o ambiente de desenvolvimento.
- `npm run build`: executa a verificação TypeScript e a compilação de produção.
- `npm run preview`: permite visualizar a versão compilada.

Ao final, executa `npm install`, responsável por instalar as dependências declaradas.

### **3.2 Configuração do TypeScript**

O arquivo `tsconfig.json` é criado com configurações que incluem:

- Compilação direcionada ao padrão ES2022.
- Utilização de módulos ESNext.
- Resolução de módulos compatível com ferramentas de empacotamento.
- Verificação rigorosa de tipos com `strict: true`.
- Configuração `noEmit: true`, evitando geração direta de JavaScript pelo TypeScript.

Dessa forma, o TypeScript verifica o código enquanto o Vite fica responsável por gerar os arquivos destinados ao navegador.

### **3.3 Preparação da interface HTML**

O Bootstrap gera um `index.html` contendo um elemento `div` com o identificador `app`.

Esse elemento funciona como ponto de montagem da aplicação.

Também cria o arquivo `main.ts`, que importa o CSS e chama:

```
createShowtime();
```

Essa chamada representa a entrada do motor principal. Entretanto, o Bootstrap cria inicialmente o arquivo `engine.ts` vazio; portanto, o motor ainda precisa ser implementado para que a aplicação funcione.

### **3.4 Preparação do motor tridimensional**

O Bootstrap cria arquivos destinados às seguintes responsabilidades:

| Módulo          | Responsabilidade prevista                |
| --------------- | ---------------------------------------- |
| `engine.ts`     | Coordenação central do sistema 3D.       |
| `renderer.ts`   | Configuração da renderização WebGL.      |
| `camera.ts`     | Controle e posicionamento da câmera.     |
| `loop.ts`       | Atualização contínua dos quadros.        |
| `pub.ts`        | Construção do ambiente da casa de shows. |
| `stage.ts`      | Estrutura do palco.                      |
| `bar.ts`        | Estrutura do bar.                        |
| `dancefloor.ts` | Área da pista de dança.                  |
| `lighting.ts`   | Iluminação do cenário.                   |

**Observação:** o Bootstrap apenas cria esses arquivos vazios. A implementação de cada componente acontece posteriormente.

### **3.5 Preparação dos personagens e instrumentos**

A estrutura inclui arquivos destinados ao carregamento e gerenciamento de personagens e instrumentos.

O objetivo dessa separação é permitir que músicos, modelos tridimensionais e animações sejam desenvolvidos de maneira independente.

O Bootstrap também cria os diretórios para armazenar arquivos de recursos, como modelos FBX e GLB, mas não realiza automaticamente o download desses modelos.

### **3.6 Preparação do sistema de áudio**

O script cria os arquivos:

- `audio-engine.ts`
- `analyzer.ts`
- `beat-detector.ts`

Eles são destinados, respectivamente, à implementação do áudio, à análise de sinais sonoros e à detecção de batidas.

Essa organização permite desenvolver posteriormente funcionalidades como sincronização de animações e efeitos visuais com a música.

### **3.7 Preparação do Rust e WebAssembly**

Uma parte importante do Bootstrap é a geração do módulo `crowd-engine`, escrito em Rust.

O arquivo `Cargo.toml` declara o pacote Rust e sua dependência `wasm-bindgen`, utilizada para facilitar a comunicação entre Rust e JavaScript por meio de WebAssembly.

O código `lib.rs` implementa a estrutura `CrowdEngine`, que possui:

| Elemento   | Função                                                        |
| ---------- | ------------------------------------------------------------- |
| `count`    | Armazena a quantidade de integrantes da multidão.             |
| `time`     | Mantém o tempo acumulado da simulação.                        |
| `energy`   | Representa o nível de energia utilizado nos movimentos.       |
| `update()` | Atualiza o tempo e a energia.                                 |
| `get_x()`  | Calcula uma coordenada horizontal X.                          |
| `get_z()`  | Calcula uma coordenada horizontal Z.                          |
| `get_y()`  | Calcula uma oscilação vertical baseada no tempo e na energia. |

O objetivo dessa estrutura é preparar cálculos relacionados à movimentação de figurantes.

**Limitação importante:** o Bootstrap não compila o módulo Rust em WebAssembly e não integra automaticamente esse módulo ao Three.js. Ele apenas prepara o código e a configuração necessários para uma futura integração.

## **4. Relação entre Bootstrap e Engine**

| Bootstrap                          | Engine                                          |
| ---------------------------------- | ----------------------------------------------- |
| Executado para preparar o projeto. | Executado quando a aplicação é iniciada.        |
| Cria diretórios e arquivos.        | Gerencia os componentes do jogo.                |
| Instala dependências.              | Atualiza personagens e cenário.                 |
| Configura TypeScript e Vite.       | Coordena renderização, áudio e interações.      |
| Prepara o módulo Rust.             | Pode integrar sistemas de multidão e animações. |
| Não renderiza o cenário.           | Controla a experiência 3D em tempo real.        |

Essa separação é importante porque demonstra que a orquestração inicial do ambiente e a orquestração do funcionamento do jogo são processos diferentes.

## **5. Pontos de atenção identificados**

Na análise do arquivo `bootstrap.sh` fornecido, foram identificadas algumas limitações técnicas:

**Sobrescrita de configurações:** o script utiliza redirecionamento com `>` para criar arquivos como `package.json`, `index.html` e `main.ts`. Se for executado novamente dentro de uma estrutura existente, poderá sobrescrever esses arquivos.

**Arquivos funcionais vazios:** os módulos criados com `touch` não possuem implementação inicial. Por isso, executar o Bootstrap não significa que o jogo já estará pronto para funcionar.

**Ausência de compilação Rust:** o código do `CrowdEngine` é gerado, mas não existe uma etapa que execute a compilação para WebAssembly.

**Dependência do ambiente:** o script exige Bash, Node.js e npm disponíveis para executar todas as etapas.

**Diferença entre versões:** o Bootstrap analisado declara Vite 7, enquanto o log de compilação apresentado anteriormente utiliza Vite 6.4.6. Isso indica uma diferença de configuração entre os materiais analisados, sem necessariamente representar um erro.

## **6. Conclusão**

O `bootstrap.sh` do Showtime 3D atua como um **automatizador da configuração inicial do projeto**, organizando os diretórios, criando arquivos de configuração, preparando módulos TypeScript e Rust e instalando as dependências necessárias.

Sua principal contribuição é reduzir o trabalho manual de preparação, estabelecer uma arquitetura modular e facilitar o início do desenvolvimento.

A orquestração realizada pelo Bootstrap abrange a estrutura do motor 3D, os componentes do cenário, os personagens, a multidão, o áudio, a interface e a base de integração com WebAssembly.

Entretanto, ele não substitui o motor principal da aplicação e não implementa automaticamente todas essas funcionalidades.

**Em resumo, o Bootstrap prepara a infraestrutura do Showtime 3D; a Engine é responsável por colocar o ambiente tridimensional em funcionamento.**

Base documental: arquivo `bootstrap.sh` enviado anteriormente e estrutura de código compartilhada na conversa. O repositório GitHub foi indicado como referência, mas seu conteúdo remoto não pôde ser acessado nesta consulta; portanto, este relatório não confirma eventuais alterações publicadas posteriormente no GitHub.
