---
name: beyondtime-git-flow
description: >-
  Guia normativo e automatizado para criação correta de branches, padronização de commits (Conventional Commits),
  gestão ágil no Kanban e abertura de Pull Requests no projeto BeyondTime (Edital nº 02/2026 - UNINASSAU Aracaju).
  Use esta skill sempre que qualquer integrante da equipe for criar branches, commitar código, vincular Issues ou abrir PRs.
---

# 🚀 BeyondTime — Skill Oficial de Commits, GitFlow e Kanban

Esta skill padroniza o fluxo de trabalho de versionamento no repositório do **BeyondTime**, garantindo cumprimento estrito da **Política de Governança, Gestão de Código e Fidelidade ao Planejamento v1.0** e da **Matriz de Rastreabilidade (RF01 a RF14)** exigidas no Edital nº 02/2026 da UNINASSAU Aracaju.

---

## 🎯 Regras de Ouro (Invioláveis)

1. **`main` é SAGRADA:** Apenas código estável de releases homologadas. **PROIBIDO commit ou push direto.**
2. **`develop` é o tronco de integração:** Toda feature deve nascer e ser mesclada na `develop` via Pull Request (PR) com revisão.
3. **Nomenclatura Obrigatória de Branch:** Toda branch de trabalho **DEVE** conter o código do Requisito Funcional:
   - Formato: `feature/rf-XX-<descricao-curta>` ou `bugfix/rf-XX-<descricao-curta>`
   - Exemplo: `feature/rf-01-autenticacao-jwt`, `feature/rf-06-ux-defensiva`.
4. **Padrão Obrigatório de Commit (Conventional Commits):**
   - Formato: `<tipo>(<escopo>): <descrição em tom imperativo>`
   - Exemplo: `feat(rf-01): implementa autenticacao jwt e refresh token`
5. **Vínculo com o Kanban (GitHub Projects):**
   - Todo cartão/issue no Kanban possui a tag `[RF-XX]`.
   - Limite de WIP: **Máximo de 2 tarefas simultâneas** por desenvolvedor na raia *In Progress*.

---

## 🧭 Passo a Passo do Desenvolvedor (Do Início ao Merge)

### 1️⃣ Antes de Começar
1. Acesse o quadro **Gestão Ágil (GitHub Projects)**.
2. Escolha o cartão da funcionalidade em `Todo` (ex: `[RF-06] UX Defensiva 50+`).
3. Mova o cartão para **`In Progress`** e atribua a você (respeitando o limite de máx. 2 tarefas).
4. No terminal ou GitHub Desktop, atualize sua base local a partir da `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   ```

### 2️⃣ Criar a Branch da Feature
Crie a branch sempre a partir da `develop` atualizada:
```bash
git checkout -b feature/rf-XX-nome-da-tarefa
# Exemplo real:
git checkout -b feature/rf-06-ux-defensiva
```

---

## ✍️ Guia de Commits (Conventional Commits)

### Estrutura
```text
<tipo>(<escopo-rf>): <mensagem curta no imperativo>
```

### Tipos Permitidos:
- **`feat`**: Nova funcionalidade ou requisito de negócio.
  - Ex: `feat(rf-06): adiciona modal de confirmacao dupla em acoes de curtida`
  - Ex: `feat(rf-01): implementa login social via google oauth2`
- **`fix`**: Correção de bug no código existente.
  - Ex: `fix(rf-01): corrige expiracao incorreta de refresh token jwt`
  - Ex: `fix(rf-06): ajusta tamanho minimo de toque para 48x48dp no botao voltar`
- **`docs`**: Alterações em documentações técnicas, markdown ou PDFs acadêmicos.
  - Ex: `docs(rf-10): atualiza especificacao de fallback local no roadmap`
- **`style`**: Ajustes de layout, CSS/Tailwind, alto contraste ou formatação sem alterar regras de negócio.
  - Ex: `style(rf-09): aplica paleta de alto contraste wcag aaa no tema escuro`
- **`refactor`**: Refatoração estrutural de código sem alterar funcionalidade ou criar novo requisito.
  - Ex: `refactor(rf-05): otimiza calculo de similaridade de matriz de hobbies`
- **`chore`**: Tarefas de manutenção, build, dependências ou docker.
  - Ex: `chore(docker): atualiza compose com variaveis de ambiente seguras`

### Boas Práticas de Mensagem:
- ✅ **Certo:** `feat(rf-02): valida bloqueio automatico de cadastro para menores de 50 anos`
- ❌ **Errado:** `subindo alteracoes`, `ajustes`, `codigo pronto`, `feat: perfil`.

---

## 🗺️ Tabela Rápida de Rastreabilidade (RF01 a RF14)

Consulte o código correto para usar na branch e no commit:

| Código | Requisito Oficial | Exemplo de Branch | Exemplo de Commit |
| :---: | :--- | :--- | :--- |
| **RF01** | Autenticação JWT / OAuth2 Google e Logout | `feature/rf-01-auth-jwt` | `feat(rf-01): implementa login google e emissao jwt` |
| **RF02** | Cadastro/Edição de Perfil 50+ | `feature/rf-02-perfil-50plus` | `feat(rf-02): implementa bloqueio para idade menor que 50` |
| **RF03** | Taxonomia de Hobbies (mín 3 e máx 10) | `feature/rf-03-taxonomia-hobbies` | `feat(rf-03): cria catalogo visual com limite de 10 hobbies` |
| **RF04** | Banco Relacional Normalizado (3FN a 5FN) | `feature/rf-04-persistencia-3fn` | `feat(rf-04): adiciona migrations flyway do schema 5fn` |
| **RF05** | Match por Afinidade e Proximidade em Sergipe | `feature/rf-05-match-afinidade` | `feat(rf-05): calcula compatibilidade ordenando feed por score` |
| **RF06** | UX Defensiva 50+ (Toque $\ge 48\text{dp}$ e Confirmação Dupla) | `feature/rf-06-ux-defensiva` | `feat(rf-06): cria confirmacao dupla para desinteresse` |
| **RF07** | Chat Simplificado em Tempo Real (STOMP) | `feature/rf-07-chat-stomp` | `feat(rf-07): integra mensageria websocket com latencia sub-100ms` |
| **RF08** | Bloqueio e Desbloqueio Instantâneo | `feature/rf-08-bloqueio-contatos` | `feat(rf-08): implementa ocultacao mutua imediata de contatos` |
| **RF09** | Painel de Acessibilidade (Fonte 100-160% e WCAG AAA) | `feature/rf-09-acessibilidade` | `feat(rf-09): adiciona seletor dinamico de escala de fonte` |
| **RF10** | Assistente Quebra-Gelo (`BeyondAssistant` / Fallback) | `feature/rf-10-assistente-ia` | `feat(rf-10): integra spring ai com fallback local de 50ms` |
| **RF11** | Biometria Facial e Selo de Verificado 50+ | `feature/rf-11-biometria-facial` | `feat(rf-11): concede selo verificado apos prova de vida` |
| **RF12** | Denúncia Rápida e Congelamento Cautelar | `feature/rf-12-denuncia-moderacao` | `feat(rf-12): aciona suspensao preventiva e chamado de auditoria` |
| **RF13** | Portal de Privacidade LGPD (Exportação JSON) | `feature/rf-13-exportacao-lgpd` | `feat(rf-13): disponibiliza download completo de dados em json` |
| **RF14** | Exclusão Definitiva de Conta e Dados (48h) | `feature/rf-14-exclusao-conta` | `feat(rf-14): programa delecao logica e fisica em ate 48h` |

---

## 🚀 Finalizando a Tarefa e Abrindo o Pull Request (PR)

1. **Self-Review Local:** Garanta que seu código compila e não quebra testes:
   ```bash
   git status
   git diff
   ```
2. **Envio da Branch para o GitHub:**
   ```bash
   git push -u origin feature/rf-XX-sua-tarefa
   ```
3. **No GitHub:**
   - Abra um Pull Request com destino para a branch **`develop`** (nunca para a `main`).
   - Título do PR: `[RF-XX] Breve descrição da funcionalidade` (ex: `[RF-06] Implementa confirmação dupla e botões defensivos 50+`).
   - Descrição: Liste o que foi feito, como testar e mencione a Issue (ex: `Closes #10`).
   - Mova o cartão no Kanban para a raia **`QA / Code Review`**.
4. **Peer Review:**
   - Solicite a revisão de pelo menos 1 integrante da equipe.
   - O merge deve ser feito **sem fast-forward (`--no-ff`)** para manter a árvore limpa e auditável pela banca examinadora.
5. **Finalização:** Após o merge na `develop`, o cartão vai para **`Done`**! 🎉
