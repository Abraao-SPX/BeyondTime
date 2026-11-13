# BeyondTime — Governança Front-End, UX Defensiva ([RF-06]) e Clean Code

## 1. Rastreabilidade e Contexto
- **Requisito:** `[RF-06]` — UX Defensiva e Ergonomia 50+ (WCAG 2.1 AAA)
- **Release / Onda:** `Onda 2 (MVP)`
- **Módulo Técnico:** `UI Components`
- **Alvo de Produção:** `BeyondTime/site/`

---

## 2. Git Flow e Governança de Commits (Tabela 1)
- **Branch de Trabalho:** `feature/rf-06-ux-defensiva`, criada exclusivamente a partir de `develop`:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feature/rf-06-ux-defensiva
  ```
- **Trava Git e Regra de Merge:** É proibido realizar commit, push ou merge direto em `main` ou `develop`. A integração na `develop` ocorre exclusivamente via **Pull Request (PR)** aprovado por **Peer Review**, validando os critérios de aceite do `[RF-06]`.
- **Padrão de Commits Obrigatório (com tag `[RF-06]`):**
  - `docs(rf-06): [RF-06] adiciona SKILL.md com governanca de UX defensiva e GitFlow`
  - `feat(rf-06): [RF-06] estrutura React 18 + Vite com design tokens 50+ WCAG AAA`
  - `feat(rf-06): [RF-06] implementa componentes TelaLogin, CriarMinhaConta e RecuperarSenha`
  - `feat(rf-06): [RF-06] implementa modal de confirmacao dupla com temporizador defensivo de 3s`

---

## 3. Arquitetura do Monorepo e Stack Homologada
- **Escopo Permitido:** `BeyondTime/site/`
- **Diretórios Protegidos (proibido modificar nesta entrega):** `backend/`, `ml-antifraude/`, `Reconhecimeto_Facil/`, `mobile/`.
- **Stack Web Homologada (Roadmap & Política de Governança):**
  - **React 18 + Vite + TypeScript** (`src/components/`, `src/styles.css`, `src/App.tsx`, `src/main.tsx`).
  - **Infraestrutura Docker Preservada:** `Dockerfile` com build multi-stage (`node:20-alpine` -> `nginx:stable-alpine`), preservando `compose.yml`, `nginx.conf` e todos os SVGs em `assets/`.
- **Componentização Obrigatória (`src/components/`):**
  - `HeaderGlobal.tsx`
  - `FooterGlobal.tsx`
  - `TelaLogin.tsx`
  - `CriarMinhaConta.tsx`
  - `RecuperarSenha.tsx`
  - `DefensiveModalRF06.tsx`

---

## 4. Regras de Clean Code e Acessibilidade (WCAG 2.1 AAA)
- **HTML Semântico em JSX:** `<header>`, `<main>`, `<section>`, `<form>`, `<dialog>` e `<footer>`.
- **Zero CSS inline** (`style={{...}}`) e **zero handlers globais**.
- **Formulários Acessíveis:** Todo `<input>` associado explicitamente ao `<label htmlFor="...">`, com `aria-invalid` e `aria-describedby` vinculados ao erro inline (`role="alert"`).
- **CSS Modular (`src/styles.css`):** Design Tokens semânticos em `:root`, nomenclatura BEM, `box-sizing: border-box` universal e `width: 100%` nos grupos de formulário e inputs.
- **TypeScript Limpo:** Tipagem estrita, funções puras com Responsabilidade Única (SRP), limpeza adequada de timers (`clearInterval` no `useEffect`) e ausência de `console.log` ou `dangerouslySetInnerHTML`.

---

## 5. UX Defensiva ([RF-06]) e Temporizador de 3 Segundos
- **Alvos de Toque (`>= 48x48dp`):** Todos os controles interativos possuem altura mínima de `48px` (`52px`–`54px` em inputs e CTAs) e espaçamento de `12px`–`14px`.
- **Confirmação em Duas Etapas com Temporizador Defensivo (Onda 2 do Roadmap):**
  - Ao tentar navegar ou acionar `< Voltar ao login` com dados digitados no formulário, o `DefensiveModalRF06` é aberto via `showModal()`.
  - Bloqueio total de fechamento acidental: sem botão `"X"`, sem fechamento por clique no backdrop e sem fechamento pela tecla `ESC`.
  - **Botão Seguro Padrão:** `"Continuar preenchendo meu cadastro"` permanece habilitado e recebe foco automático imediato (`t = 0`).
  - **Botão Destrutivo com Temporizador de 3s:** `"Sim, voltar e apagar dados"` inicia `disabled` por **3 segundos** com contagem regressiva visível no próprio rótulo (`"Aguarde 3s para confirmar descarte..."` -> `"Aguarde 2s para confirmar descarte..."` -> `"Aguarde 1s para confirmar descarte..."`), habilitando `"Sim, voltar e apagar dados"` somente após zerar o temporizador.
