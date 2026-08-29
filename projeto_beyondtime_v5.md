# BeyondTime — Plano Completo do Projeto — V5

> **Nova direção do projeto:** o projeto anterior BemIdade foi substituído pelo **BeyondTime**.  
> O sistema **não é mais um aplicativo de medicamentos, consultas ou acompanhamento de rotina**.  
> O foco agora é **conexão social, amizade, companheirismo e relacionamentos para pessoas maduras**, com segurança, acessibilidade e afinidade como pilares.

**Frase-conceito:**  
> “Conexões reais não têm idade. Segurança para viver novas histórias.”

---

# 0. Checklist Geral do Projeto

Legenda:

- ⬜ Pendente
- 🟡 Em definição / desenvolvimento
- ✅ Definido
- 🔬 Experimental
- ❌ Fora do escopo atual

## 0.1 Produto e pesquisa

- ✅ Nome do produto: **BeyondTime**
- ✅ Público principal: pessoas com **50 anos ou mais**
- ✅ Propósito geral definido
- ✅ Segurança como pilar central
- ✅ Acessibilidade como pilar central
- ✅ Afinidade acima de aparência como princípio
- ⬜ Entrevistar usuários 50+
- ⬜ Validar necessidades de amizade, companhia e relacionamento
- ⬜ Validar barreiras tecnológicas
- ⬜ Validar percepção de segurança
- ⬜ Criar personas com base em pesquisa real
- ⬜ Testar protótipos com usuários reais
- ⬜ Revisar MVP após testes

## 0.2 UX/UI
- ⬜ Prototipar Modo Conhecer com Calma;
- ⬜ Prototipar apresentação em áudio;
- ⬜ Prototipar quebra-gelo por afinidade;
- ⬜ Prototipar Primeiro Encontro Seguro;
- ⬜ Prototipar contato de confiança opcional;
- ⬜ Validar indicadores objetivos de verificação;


- 🟡 Criar interface acessível e minimalista
- ⬜ Prototipar cadastro assistido
- ⬜ Prototipar verificação de identidade
- ⬜ Prototipar descoberta de pessoas
- ⬜ Prototipar perfil
- ⬜ Prototipar match/conexão
- ⬜ Prototipar chat protegido
- ⬜ Prototipar denúncia e bloqueio
- ⬜ Prototipar central de segurança
- ⬜ Testar tamanhos de texto e áreas de toque
- ⬜ Evitar dependência exclusiva de gestos de swipe

## 0.3 Segurança

- 🟡 Avaliar **OpenBiometrics** para verificação facial;
- ⬜ Prototipar YuNet + SFace + MiniFASNet;
- ⬜ Testar liveness em ambiente controlado;
- ⬜ Definir limiar de comparação facial;
- ⬜ Definir retenção de selfie e embeddings;

- 🟡 Definir processo de verificação de perfil
- ⬜ Implementar verificação de telefone/e-mail
- ⬜ Avaliar selfie ao vivo + liveness
- ⬜ Implementar bloqueio
- ⬜ Implementar denúncia
- ⬜ Implementar auditoria de ações críticas
- ⬜ Criar alertas educativos contra golpes
- ⬜ Definir política de moderação
- ⬜ Definir tratamento de reincidência
- ⬜ Definir processo de recurso de suspensão
- ⬜ Definir política para links externos
- ⬜ Definir proteção contra spam
- ⬜ Definir proteção contra criação massiva de contas

## 0.4 Machine Learning e IA
- ✅ Diretriz: reconhecimento facial e ML devem utilizar soluções open source;
- ⬜ Auditar licenças dos modelos e pesos pré-treinados;
- ⬜ Documentar licença de cada componente usado;
- ⬜ Evitar dependência obrigatória de serviços proprietários de visão;
- ⬜ Garantir execução local/própria da prova de conceito;


- 🔬 Classificador de mensagens com possíveis sinais de fraude
- 🔬 Sistema de recomendação/matching por afinidade
- 🔬 Visão computacional para apoio à verificação de identidade
- ⬜ Construir dataset para classificador de fraude
- ⬜ Definir classes e critérios de rotulagem
- ⬜ Criar baseline
- ⬜ Testar Regressão Logística
- ⬜ Testar Naive Bayes
- ⬜ Testar outros modelos somente se necessário
- ⬜ Avaliar precisão, recall, F1 e matriz de confusão
- ⬜ Definir limiar de alerta com base em testes
- ⬜ Versionar modelos
- ⬜ Registrar métricas
- ⬜ Garantir fallback sem ML
- ⬜ Avaliar falsos positivos e falsos negativos
- ⬜ Garantir que ML não acuse automaticamente alguém de golpe

## 0.5 Backend e arquitetura

- 🟡 Backend: Java 21 + Spring Boot 3
- 🟡 Arquitetura inicial: Modular Monolith
- 🟡 Banco principal: PostgreSQL
- 🟡 API REST
- ⬜ Definir contrato OpenAPI
- ⬜ Implementar autenticação/autorização
- ⬜ Implementar perfis
- ⬜ Implementar preferências
- ⬜ Implementar motor de conexões
- ⬜ Implementar matches
- ⬜ Implementar chat
- ⬜ Implementar denúncias/bloqueios
- ⬜ Integrar serviço de ML
- ⬜ Definir armazenamento de imagens
- ⬜ Docker/Docker Compose
- ⬜ Testes automatizados
- ⬜ Observabilidade/logs

## 0.6 Frontend

- 🟡 Implementar **Entrar com Google**;
- ⬜ Criar OAuth clients para Android, iOS e Web;
- ⬜ Validar token Google no backend;
- ⬜ Gerar sessão/JWT próprio após autenticação;
- ⬜ Manter login tradicional como fallback;
- ⬜ Revisar Sign in with Apple para publicação iOS;

- 🟡 React Native + Expo
- 🟡 React Native Web
- 🟡 TypeScript
- 🟡 Expo Router
- 🟡 Zustand
- 🟡 TanStack Query
- 🟡 React Hook Form + Zod
- ⬜ Design System do BeyondTime
- ⬜ Aplicativo Android
- ⬜ Aplicativo iOS
- ⬜ Experiência web
- ⬜ Notificações push
- ⬜ Chat em tempo real

## 0.7 LGPD e privacidade

- ⬜ Consentimento
- ⬜ Política de privacidade
- ⬜ Termos de uso
- ⬜ Minimização de dados
- ⬜ Retenção de selfies/documentos
- ⬜ Exclusão de conta
- ⬜ Exportação de dados
- ⬜ Controle de visibilidade do perfil
- ⬜ Proteção de mensagens
- ⬜ Política de moderação
- ⬜ Revisão específica de dados biométricos antes de produção

---

# 1. Visão Geral

O **BeyondTime** é uma plataforma de relacionamento e comunidade voltada principalmente para pessoas com **50 anos ou mais** que desejam ampliar sua rede social, encontrar companhia, construir amizades ou iniciar relacionamentos.

O produto parte de quatro problemas principais:

1. Dificuldade de encontrar espaços digitais construídos para pessoas maduras;
2. Interfaces de relacionamento frequentemente orientadas a velocidade, aparência e excesso de estímulos;
3. Medo de perfis falsos, golpes e abordagens financeiras;
4. Necessidade de criar novas conexões sociais com autonomia e confiança.

O BeyondTime não deve ser apresentado simplesmente como um “Tinder para idosos”.

A proposta é:

> **Uma plataforma 50+ para criar conexões por afinidade, com experiência acessível e mecanismos de segurança visíveis durante toda a jornada.**

---

# 2. Mudança em Relação ao Projeto Anterior

## 2.1 O que foi removido

As seguintes áreas do antigo BemIdade deixam de fazer parte do projeto:

- Gestão de medicamentos;
- Confirmação de doses;
- Alarmes de medicamentos;
- Evidência visual de medicamento;
- Consultas médicas;
- Agenda de saúde;
- Check-in “Estou bem” como monitoramento familiar;
- Dashboard de cuidador;
- Alertas enviados por familiar;
- Acompanhamento de rotina pelo familiar;
- Funcionalidades de cuidado relacionadas a medicação;
- Arquitetura específica para lembretes de saúde.

Essas funcionalidades **não devem ser reaproveitadas apenas porque já estavam documentadas**.

## 2.2 O que pode ser reaproveitado tecnicamente

Podem ser reaproveitados conceitos técnicos genéricos:

- React Native + Expo;
- React Native Web;
- TypeScript;
- Spring Boot;
- PostgreSQL;
- Docker;
- Autenticação;
- Notificações;
- Upload de imagens;
- Design acessível;
- Testes;
- Documentação;
- LGPD;
- Pipeline de Machine Learning;
- Modular Monolith.

---

# 3. Público-Alvo

Pessoas com **50 anos ou mais** interessadas em:

- Relacionamento sério;
- Companhia;
- Amizade;
- Conversa;
- Atividades sociais;
- Encontrar pessoas com interesses semelhantes.

O público é heterogêneo. Não assumir que todas as pessoas 50+:

- Possuem baixa alfabetização digital;
- Precisam de ajuda familiar;
- Têm dificuldades cognitivas;
- Querem relacionamento amoroso;
- Possuem as mesmas necessidades de acessibilidade.

A interface deverá ser simples sem infantilizar.

---

# 4. Proposta de Valor

## Elevator Pitch

**Para:** pessoas 50+ que buscam amizades, companheirismo ou relacionamentos.

**Que:** desejam novas conexões, mas encontram insegurança, receio de golpes e interfaces pouco adequadas às suas preferências.

**O BeyondTime é:** uma plataforma de relacionamento e comunidade com foco em segurança, acessibilidade e afinidade.

**Diferente de:** aplicativos generalistas que priorizam velocidade, aparência e grande volume de estímulos.

**O BeyondTime oferece:** perfis com mecanismos de verificação, descoberta por afinidade, comunicação protegida, recursos contra comportamentos suspeitos e interface acessível.

---

# 5. Princípios do Produto

1. **Segurança antes da interação.**
2. **Acessibilidade sem infantilização.**
3. **Afinidade além da aparência.**
4. **Autonomia do usuário.**
5. **Privacidade por padrão.**
6. **Tecnologia como apoio, não substituta da interação humana.**
7. **Alertar sobre risco sem acusar automaticamente.**
8. **Relacionamento não é a única forma válida de conexão.**

---


# 5.1 Política Open Source do Projeto

O BeyondTime adotará como diretriz:

> **Toda a camada de Machine Learning e reconhecimento facial deverá utilizar soluções open source auditáveis pela equipe.**

Isso inclui:

- Código-fonte;
- Bibliotecas;
- Modelos;
- Pesos pré-treinados;
- Dependências usadas para inferência.

## Regra de licenciamento

Antes de incorporar qualquer solução, a equipe deverá verificar:

- Licença do repositório;
- Licença dos pesos/modelos pré-treinados;
- Permissão para uso acadêmico;
- Permissão para redistribuição;
- Restrições de uso comercial;
- Obrigações de atribuição.

Open source não será tratado como sinônimo automático de “uso comercial liberado”.

## Reconhecimento facial

A direção principal será:

```text
YuNet
↓
detecção facial

SFace
↓
comparação facial 1:1

MiniFASNet
↓
liveness / anti-spoofing
```

Esses componentes deverão rodar em infraestrutura controlada pela equipe, por meio de um serviço Python próprio.

## ML antifraude

O classificador de mensagens deverá utilizar ferramentas open source:

- Python;
- pandas;
- scikit-learn;
- FastAPI, quando necessário;
- joblib, quando necessário.

## Serviços fechados

Não utilizar como dependência principal do reconhecimento facial:

- AWS Rekognition;
- Google Cloud Vision;
- Azure Face;
- serviços equivalentes proprietários.

Serviços externos fechados poderão ser estudados apenas como comparação, nunca como requisito central do MVP.

## Autenticação

O login com Google poderá continuar existindo como **opção de conveniência**, mas ele não será considerado parte da camada open source do reconhecimento facial/ML.

Se a equipe desejar uma autenticação mais independente de fornecedores, poderá avaliar:

- Keycloak;
- Spring Security com autenticação própria.

------------------------------------------------------------------------

# 6. Tipos de Conexão

No cadastro, o usuário poderá informar o que procura:

```text
O QUE VOCÊ PROCURA?

❤️ Relacionamento

☕ Companhia

🤝 Amizade

💬 Conversar

🎭 Pessoas para sair

✈️ Companhia para atividades/viagens
```

O sistema deverá utilizar essas intenções para evitar recomendar pessoas com objetivos incompatíveis.

---


# 6.1 Login Simplificado com Conta Google

Para facilitar a entrada de pessoas 50+ e reduzir a necessidade de criar e memorizar uma nova senha, o BeyondTime deverá oferecer:

```text
ENTRAR NO BEYONDTIME

[ G  Continuar com Google ]

ou

E-mail / telefone
[ CONTINUAR ]
```

## Objetivo

O login com Google será utilizado para:

- Reduzir etapas;
- Evitar criação desnecessária de novas senhas;
- Facilitar o retorno ao aplicativo;
- Diminuir erros de digitação;
- Aproveitar uma conta Google que o usuário já utilize no aparelho.

## Arquitetura

```text
React Native / Expo
        ↓
Google Sign-In / OAuth 2.0 + OpenID Connect
        ↓
Token de identidade
        ↓
Spring Boot
        ↓
Validação da identidade Google
        ↓
Conta BeyondTime
        ↓
JWT/sessão própria
```

O aplicativo **não deverá solicitar nem armazenar a senha da conta Google**.

## Implementação Expo

Opções atuais a avaliar:

- `react-native-nitro-google-signin`, com suporte a APIs nativas modernas;
- `@react-native-google-signin/google-signin`.

Como essas integrações utilizam código nativo, o projeto deverá usar **Expo Development Build / EAS Build**, não depender apenas do Expo Go.

## Clientes OAuth

Criar clientes OAuth adequados para:

- Android;
- iOS;
- Web.

O backend deverá validar o token recebido antes de criar uma sessão própria do BeyondTime.

## Regra importante

**Login Google não substitui a verificação de perfil.**

```text
Conta Google autenticada
       ↓
Conta BeyondTime criada
       ↓
Perfil preenchido
       ↓
Selfie/liveness
       ↓
Perfil verificado
```

## Fallback

O usuário não será obrigado a possuir conta Google.

Manter alternativa por:

- E-mail;
- Telefone, se implementado.

Para publicação no iOS, a equipe deverá revisar as regras vigentes da App Store sobre login social e avaliar **Sign in with Apple** quando aplicável.

------------------------------------------------------------------------

# 7. Cadastro Assistido

O cadastro deverá utilizar:

- Etapas curtas;
- Texto legível;
- Linguagem clara;
- Indicador de progresso;
- Explicação de por que cada dado é solicitado;
- Validação simples;
- Possibilidade de voltar sem perder tudo.

Fluxo conceitual:

```text
Criar conta
    ↓
Confirmar e-mail/telefone
    ↓
Data de nascimento
    ↓
Nome e cidade
    ↓
Interesses
    ↓
O que procura
    ↓
Fotos
    ↓
Verificação
    ↓
Perfil pronto
```

---

# 8. Perfil

O perfil poderá conter:

- Nome;
- Idade;
- Cidade/região aproximada;
- Fotos;
- Biografia;
- Interesses;
- Atividades favoritas;
- Intenção de conexão;
- Preferências de descoberta;
- Apresentação em áudio opcional;
- Selo de perfil verificado;
- Configurações de privacidade.

Exemplo:

```text
MARIA, 67

📍 Aracaju

❤️ Interesses
🎵 MPB
🌊 Praia
🍳 Cozinhar
💃 Dançar

Procuro:
☕ Companhia
❤️ Relacionamento

"Adoro conversar e conhecer
lugares novos."

[ CONHECER ]
[ PASSAR ]
```

Não depender exclusivamente de swipe.

---

# 9. Descoberta por Afinidade

O BeyondTime deverá valorizar compatibilidade de interesses e intenção.

Possíveis sinais:

- Interesses em comum;
- Objetivo de conexão;
- Atividades favoritas;
- Faixa etária preferida;
- Distância aproximada;
- Disponibilidade/rotina, se o usuário optar por informar;
- Preferências declaradas;
- Interações anteriores.

Exemplo:

```text
✨ BOA COMPATIBILIDADE

João, 70

Vocês têm em comum:

🎵 MPB
🌊 Praia
🚶 Caminhada

[ VER PERFIL ]
```

O percentual de compatibilidade somente deverá ser mostrado se houver metodologia clara e compreensível.

---

# 10. Match / Conexão

Uma conversa só poderá começar conforme as regras definidas para o MVP.

Exemplo:

```text
VOCÊS QUEREM SE CONHECER 💜

Maria ↔ João

[ 💬 COMEÇAR CONVERSA ]
```

O sistema deve evitar mecânicas que incentivem interação compulsiva ou volume excessivo de perfis.

---

# 11. Chat Seguro

O chat será uma área central do BeyondTime.

MVP:

- Texto;
- Emojis;
- Áudio opcional;
- Estado de envio;
- Notificação de nova mensagem;
- Bloqueio;
- Denúncia;
- Acesso rápido à Central de Segurança;
- Análise experimental de possíveis sinais de fraude.

Arquitetura conceitual:

```text
Usuário A
   ↓
Chat
   ↓
Backend
   ├──→ armazenamento/mensageria
   └──→ classificador de risco
              ↓
         possível alerta
   ↓
Usuário B
```

---

# 12. “Anjo da Guarda” — Proteção Inteligente no Chat

O nome conceitual **Anjo da Guarda** representa a camada de segurança que analisa sinais textuais de risco.

Exemplos de padrões a pesquisar:

- Pedido de PIX;
- Pedido de transferência;
- Solicitação de código;
- Pedido de senha;
- Urgência financeira;
- Tentativa insistente de retirar a conversa da plataforma;
- Solicitação de informações financeiras;
- Narrativas recorrentes de emergência financeira.

Exemplo:

```text
⚠️ ATENÇÃO

Esta mensagem apresenta
possíveis sinais de risco.

Antes de enviar dinheiro ou
informações pessoais, confirme
a identidade da pessoa.

[ VER POR QUÊ ]
[ BLOQUEAR ]
[ DENUNCIAR ]
```

## Regra fundamental

O sistema não deverá afirmar:

```text
"Esta pessoa é golpista."
```

A saída deve ser probabilística e educativa:

```text
"Encontramos possíveis sinais de risco."
```

O usuário mantém autonomia.

---

# 13. Machine Learning — Classificação de Risco

## 13.1 Objetivo

Classificar mensagens quanto à presença de padrões potencialmente associados a fraude.

## 13.2 Pipeline inicial

```text
Dataset rotulado
      ↓
Limpeza/preparação
      ↓
Vetorização de texto
      ↓
Baseline
      ↓
Regressão Logística / Naive Bayes
      ↓
Avaliação
      ↓
Modelo versionado
      ↓
API Python
      ↓
Spring Boot
```

## 13.3 Classes iniciais possíveis

```text
NORMAL
SUSPEITA
```

ou, após validação:

```text
BAIXO_RISCO
RISCO_MODERADO
ALTO_RISCO
```

## 13.4 Métricas

- Precision;
- Recall;
- F1-score;
- Matriz de confusão;
- ROC-AUC quando apropriado;
- Taxa de falsos positivos;
- Taxa de falsos negativos.

## 13.5 Limiar

O documento inicial sugeria alerta acima de 75%, porém esse valor **não deverá ser tratado como definitivo sem experimento**.

O limiar deverá ser escolhido a partir dos resultados do modelo e do custo dos falsos positivos/falsos negativos.

## 13.6 Segurança do modelo

O ML:

- Não bane automaticamente por uma única mensagem;
- Não acusa criminalidade;
- Não toma decisão financeira;
- Não lê dados bancários;
- Não substitui moderação;
- Não deve impedir conversa legítima sem regra clara.

---

# 14. Sistema de Recomendação — ML Futuro/Experimental

Além do classificador de segurança, o BeyondTime poderá estudar um sistema de recomendação.

Objetivo:

> Recomendar pessoas com maior compatibilidade provável sem reduzir a experiência apenas à aparência.

Possíveis features:

- Interesses;
- Intenção;
- Preferências;
- Atividades;
- Distância aproximada;
- Histórico de perfis curtidos/ignorados;
- Conversas iniciadas;
- Feedback explícito.

No início, recomenda-se utilizar **regras transparentes de afinidade** antes de um modelo complexo.

Isso permite criar um baseline:

```text
score =
interesses_em_comum
+ intenção_compatível
+ preferências
+ distância
```

Posteriormente, um modelo poderá ser comparado ao baseline.

---

# 15. Verificação de Perfil e Reconhecimento Facial

A verificação facial será utilizada como **mecanismo de confiança no cadastro**, não como forma de identificar pessoas desconhecidas.

Objetivo:

> Verificar se a selfie ao vivo pertence provavelmente à mesma pessoa apresentada na foto do perfil e reduzir cadastros com fotos roubadas.

## 15.1 Fluxo recomendado

```text
Foto do perfil
      +
Selfie ao vivo
      ↓
Detecção facial
      ↓
Liveness / anti-spoofing
      ↓
Extração de representação facial
      ↓
Comparação 1:1
      ↓
Score de similaridade
      ↓
VERIFICADO / REVISÃO / FALHA
```

## 15.2 Opção Open Source Recomendada — OpenBiometrics

Para a prova de conceito acadêmica, a primeira solução open source a ser avaliada será o **OpenBiometrics**, desde que a equipe confirme a licença do código e dos modelos/pesos utilizados.

Componentes sugeridos:

```text
YuNet
↓
Detecção facial

SFace
↓
Comparação facial 1:1

MiniFASNet
↓
Liveness passivo / anti-spoofing
```

Vantagens:

- Deverá rodar em infraestrutura própria/controlada pela equipe;
- Possui API em Python;
- Pode ser conteinerizado;
- Evita depender obrigatoriamente de um serviço comercial;
- Permite separar detecção, reconhecimento e liveness;
- O projeto indica modelos padrão com licenças permissivas como MIT e Apache 2.0.

Arquitetura:

```text
React Native
   ↓
captura selfie
   ↓
Spring Boot
   ↓
Verification Service (Python)
   ├── YuNet
   ├── SFace
   └── MiniFASNet
   ↓
score + resultado
   ↓
Spring Boot
   ↓
status do perfil
```

## 15.3 InsightFace — alternativa experimental

O **InsightFace** também poderá ser estudado para reconhecimento facial.

Entretanto:

- O código do projeto é MIT;
- Vários modelos pré-treinados distribuídos pelo projeto são destinados a pesquisa não comercial ou exigem licença específica.

Portanto, o InsightFace pode ser útil academicamente, mas não deverá ser escolhido para produção sem revisão da licença do modelo utilizado.


## 15.3.1 Regra de independência

O MVP deverá funcionar sem depender obrigatoriamente de um provedor proprietário de reconhecimento facial.

Não utilizar serviço proprietário como requisito obrigatório de verificação.

A equipe deverá conseguir executar a prova de conceito localmente ou em infraestrutura própria.

## 15.4 Decisão recomendada para o MVP

```text
1. OpenBiometrics
   YuNet + SFace + MiniFASNet

2. InsightFace
   alternativa experimental

3. Serviço comercial
   somente se necessário futuramente
```

## 15.5 Experiência acessível

```text
🛡️ VAMOS VERIFICAR SEU PERFIL

Precisamos de uma selfie rápida.

1. Olhe para a câmera.
2. Mantenha o rosto dentro do círculo.
3. Aguarde alguns segundos.

[ COMEÇAR ]
```

Se falhar:

```text
Não conseguimos verificar agora.

Isso pode acontecer por iluminação
ou posição da câmera.

[ TENTAR NOVAMENTE ]
[ FAZER MAIS TARDE ]
```

## 15.6 Não estimar idade pelo rosto como regra

O BeyondTime **não deverá bloquear automaticamente alguém usando apenas idade estimada por IA**.

Estimativa facial de idade possui margem de erro e não comprova idade legal.

A regra 50+ deverá utilizar data de nascimento declarada e, se futuramente necessário, um processo documental específico.

## 15.7 Estados

```text
PENDING
PROCESSING
VERIFIED
REVIEW_REQUIRED
FAILED
```

## 15.8 LGPD e biometria

Dados biométricos são sensíveis.

Antes de produção:

- Obter consentimento adequado;
- Explicar finalidade;
- Definir retenção;
- Minimizar armazenamento;
- Evitar guardar selfies desnecessariamente;
- Proteger embeddings;
- Restringir acesso;
- Criar processo de exclusão;
- Registrar modelo/versão utilizados;
- Fazer análise específica de segurança e privacidade.

## 15.9 Limite da verificação

Um selo de verificação **não significa que a pessoa seja confiável em todas as situações**.

Ele significa apenas:

> “Este perfil concluiu o processo de verificação definido pelo BeyondTime.”

------------------------------------------------------------------------

# 16. Central de Segurança

Tela dedicada:

```text
🛡️ SEGURANÇA

✓ Como reconhecer golpes
✓ Nunca envie códigos
✓ Nunca compartilhe senhas
✓ Cuidado com pedidos de dinheiro

[ DENUNCIAR UMA PESSOA ]

[ VER CONTAS BLOQUEADAS ]

[ COMO TER UM ENCONTRO MAIS SEGURO ]
```

Também poderá explicar:

- Golpe do falso familiar;
- Romance scam;
- Pedido de PIX;
- Engenharia social;
- Links suspeitos;
- Cuidados em primeiro encontro.

---

# 17. Bloqueio e Denúncia

O usuário poderá bloquear ou denunciar diretamente no perfil/chat.

Motivos possíveis:

- Pedido de dinheiro;
- Assédio;
- Perfil falso;
- Conteúdo inadequado;
- Spam;
- Ameaça;
- Outro.

Fluxo:

```text
[ DENUNCIAR ]
      ↓
Escolher motivo
      ↓
Adicionar contexto opcional
      ↓
Confirmar
      ↓
Registro para moderação
```

## Suspensão automática

O documento inicial sugeria suspensão temporária após mais de três denúncias financeiras em 24h.

Essa regra será tratada como **hipótese**, não regra final.

Motivo: denúncias podem ser abusadas. O sistema deve combinar sinais, histórico e revisão/moderação quando necessário.

---

# 18. Contato de Confiança — Opcional

O BeyondTime não será um aplicativo de monitoramento familiar.

Um usuário poderá, opcionalmente, cadastrar uma pessoa de confiança para situações específicas.

Exemplo:

```text
CONTATO DE CONFIANÇA

Carlos — Filho

Pode:
✓ Receber pedido de ajuda

Não pode:
✗ Ler minhas conversas
✗ Ver meus matches
✗ Alterar meu perfil
```

Privacidade do usuário vem primeiro.

---

# 19. Acessibilidade

Acessibilidade será requisito central.

Diretrizes:

- WCAG como referência para web;
- Texto legível;
- Contraste adequado;
- Áreas de toque grandes;
- Linguagem clara;
- Ícones acompanhados de texto;
- Poucos elementos simultâneos;
- Navegação previsível;
- Feedback claro;
- Evitar gestos obrigatórios;
- Suporte a leitor de tela;
- Escala de fonte;
- Redução de movimento quando apropriado.

A interface deverá ser acessível **sem parecer infantil**.

---

# 20. Notificações

Notificações poderão ser utilizadas para:

- Novo interesse/conexão;
- Novo match;
- Nova mensagem;
- Atualização de segurança;
- Resultado de verificação;
- Aviso de moderação.

O usuário deverá controlar categorias de notificações.

Evitar notificações manipulativas como:

```text
"Você está perdendo sua chance!"
```

---

# 21. Funcionalidades do MVP

## Essenciais

1. Cadastro/login;
2. Perfil 50+;
3. Preferências e interesses;
4. Fotos;
5. Verificação básica;
6. Descoberta de perfis;
7. Afinidade;
8. Interesse/match;
9. Chat;
10. Bloqueio;
11. Denúncia;
12. Alertas educativos;
13. Classificador experimental de mensagens suspeitas;
14. Acessibilidade;
15. Notificações.

## Se houver tempo

- Áudio de apresentação;
- Mensagens de áudio;
- Liveness avançado;
- Sistema de recomendação por ML;
- Contato de confiança;
- Sugestões de quebra-gelo;
- Eventos/atividades.

## Fora do MVP inicial

- Videochamada;
- Marketplace;
- Pagamentos;
- Transferências financeiras;
- Compartilhamento de dados bancários;
- Rastreamento familiar;
- Localização em tempo real;
- Rede social aberta;
- Feed infinito;
- Sistema completo de eventos presenciais.

---


# 21.1 Sugestões de Diferenciação para o BeyondTime

## A. Apresentação por áudio

Permitir uma apresentação curta de voz:

```text
🎙️ APRESENTAÇÃO DE JOÃO
▶️ 0:28
```

## B. Quebra-gelo por afinidade

Após um match:

```text
Vocês dois gostam de MPB.

"Qual cantor de MPB marcou
mais a sua vida?"

[ USAR ESTA PERGUNTA ]
```

A IA apenas sugere; o usuário escolhe se envia.

## C. Modo “Conhecer com calma”

- Menos perfis simultâneos;
- Pontos em comum em destaque;
- Sem swipe obrigatório;
- Mais foco em qualidade da conexão.

## D. Primeiro Encontro Seguro

```text
🛡️ PRIMEIRO ENCONTRO

✓ Prefira local público
✓ Avise alguém de confiança
✓ Evite compartilhar dados financeiros
✓ Organize sua própria ida e volta
```

## E. Ajuda de Segurança

Dentro do chat:

```text
[ 🛡️ PRECISO DE AJUDA ]
```

Possíveis ações:

- Entender por que uma mensagem parece suspeita;
- Bloquear;
- Denunciar;
- Falar com contato de confiança.

## F. Eventos e atividades 50+ — pós-MVP

Exemplos:

- Café;
- Caminhada;
- Dança;
- Música;
- Clube de leitura;
- Eventos culturais.

## Prioridade sugerida

Para o MVP:

1. Apresentação por áudio;
2. Quebra-gelo por afinidade;
3. Primeiro Encontro Seguro.

Para depois:

4. Eventos;
5. Recomendações avançadas;
6. Recursos sociais adicionais.

------------------------------------------------------------------------


# 21.2 Experiência de Conexão e Confiança

Esta seção consolida funcionalidades que diferenciam o BeyondTime de uma experiência baseada apenas em fotos e swipe.

## 21.2.1 Conexão por intenção

Antes da descoberta, o usuário poderá indicar o que deseja naquele momento:

```text
O QUE VOCÊ QUER HOJE?

❤️ Conhecer alguém para relacionamento
☕ Conversar sem compromisso
🤝 Fazer uma nova amizade
🎭 Encontrar companhia para sair
🚶 Fazer uma atividade junto
```

A intenção poderá influenciar a descoberta e evitar recomendações claramente incompatíveis.

## 21.2.2 Perfil com apresentação em áudio

O usuário poderá gravar uma apresentação curta e opcional:

```text
🎙️ APRESENTAÇÃO DA MARIA

▶️ 0:34
```

Objetivos:

- Humanizar o perfil;
- Reduzir dependência de digitação;
- Permitir que personalidade e voz façam parte da apresentação;
- Melhorar acessibilidade.

O áudio deverá possuir limite de duração, possibilidade de excluir/regravar e controles de denúncia/moderação quando necessário.

## 21.2.3 Quebra-gelo inteligente

Depois de uma conexão, o BeyondTime poderá sugerir perguntas com base em interesses em comum:

```text
Vocês dois gostam de MPB.

Sugestão:

"Qual música marcou mais a sua vida?"

[ USAR ESTA PERGUNTA ]
[ OUTRA SUGESTÃO ]
```

A IA poderá gerar sugestões, porém **nunca deverá enviar uma mensagem automaticamente em nome do usuário**.

O usuário sempre revisa e decide se deseja enviar.

## 21.2.4 Modo “Conhecer com Calma”

O BeyondTime deverá evitar depender de um feed infinito de perfis.

Uma experiência experimental poderá apresentar um conjunto pequeno de recomendações de maior relevância:

```text
PESSOAS PARA CONHECER HOJE

Encontramos 3 perfis que
combinam com suas preferências.
```

Em cada perfil:

```text
VOCÊS TÊM EM COMUM

✓ Caminhada
✓ MPB
✓ Viagens
✓ Buscam relacionamento sério
```

Objetivos:

- Valorizar qualidade em vez de quantidade;
- Dar tempo para compreender o perfil;
- Reduzir estímulos desnecessários;
- Destacar afinidades reais;
- Evitar swipe obrigatório.

A quantidade diária não deverá ser fixada definitivamente antes de testes com usuários.

## 21.2.5 Primeiro Encontro Seguro

Quando usuários demonstrarem intenção de se encontrar presencialmente, o aplicativo poderá oferecer orientações opcionais:

```text
🛡️ PRIMEIRO ENCONTRO

✓ Prefira um local público
✓ Avise alguém de confiança
✓ Organize sua própria ida e volta
✓ Não compartilhe senhas ou dados bancários

[ ENTENDI ]
```

O recurso será educativo.

O BeyondTime não deverá afirmar que consegue garantir a segurança de um encontro presencial.

## 21.2.6 Contato de Confiança

O cadastro de um contato de confiança será opcional.

Exemplo:

```text
CONTATO DE CONFIANÇA

Carlos

Pode:
✓ Receber um pedido de ajuda

Não pode:
✗ Ler minhas mensagens
✗ Ver meus matches
✗ Alterar meu perfil
```

O contato de confiança **não transforma o BeyondTime em um aplicativo de monitoramento familiar**.

A autonomia e a privacidade do usuário permanecem prioritárias.

## 21.2.7 Indicadores de verificação e confiança

Em vez de criar uma nota genérica como:

```text
92% confiável
```

o aplicativo deverá mostrar sinais objetivos:

```text
🛡️ PERFIL VERIFICADO

✓ Telefone confirmado
✓ Selfie verificada
✓ Conta criada há alguns meses
```

Esses indicadores não significam que a pessoa seja segura ou confiável em todas as situações.

Eles apenas informam verificações realmente realizadas pela plataforma.

## 21.2.8 Sistema de recomendação por Machine Learning — evolução

Após existir volume suficiente de interações reais e consentidas, o BeyondTime poderá evoluir o motor de afinidade para um sistema de recomendação.

Possíveis sinais:

- Interesses em comum;
- Intenção de conexão;
- Preferências declaradas;
- Perfis pelos quais o usuário demonstrou interesse;
- Conexões iniciadas;
- Feedback explícito;
- Distância aproximada, quando autorizada.

Estratégia recomendada:

```text
FASE 1
Regras transparentes de afinidade
        ↓
Baseline
        ↓
FASE 2
Modelo de recomendação
        ↓
Comparação com baseline
        ↓
Avaliação
```

O sistema não deverá utilizar atributos sensíveis de maneira discriminatória nem otimizar apenas para aumentar tempo de uso.

## 21.2.9 Prioridade

### MVP

1. Modo Conhecer com Calma;
2. Apresentação por áudio;
3. Quebra-gelo por afinidade;
4. Primeiro Encontro Seguro;
5. Contato de confiança opcional.

### Evolução

6. Sistema de recomendação por ML;
7. Personalização progressiva das recomendações;
8. Eventos e experiências sociais 50+.

------------------------------------------------------------------------

# 22. Catálogo Geral de Funcionalidades

## Conta

- Cadastro;
- Login por e-mail/telefone;
- **Entrar com Google**;
- Recuperação de senha para conta tradicional;
- Confirmação de telefone/e-mail quando aplicável;
- Exclusão de conta;
- Logout de dispositivos.

## Perfil

- Apresentação em áudio;
- Indicadores objetivos de verificação;

- Fotos;
- Bio;
- Cidade;
- Interesses;
- Intenção;
- Preferências;
- Áudio opcional;
- Selo de verificação.

## Descoberta

- Conexão por intenção;
- Modo Conhecer com Calma;
- Explicação de afinidades;

- Perfis recomendados;
- Filtros;
- Afinidades;
- Passar;
- Demonstrar interesse;
- Visualizar perfil.

## Conexões

- Quebra-gelo por afinidade;
- Primeiro Encontro Seguro;
- Contato de confiança opcional;

- Match;
- Lista de conexões;
- Desfazer conexão;
- Preferências de contato.

## Chat

- Texto;
- Emoji;
- Áudio futuro;
- Notificações;
- Segurança contextual;
- Bloqueio;
- Denúncia.

## Segurança

- Verificação;
- Central de Segurança;
- Alertas contra fraude;
- Denúncias;
- Bloqueios;
- Moderação;
- Classificador ML;
- Auditoria.

## Privacidade

- Controle de visibilidade;
- Preferências;
- Consentimento;
- Exclusão;
- Controle de dados;
- Contato de confiança opcional.

## Acessibilidade

- Texto maior;
- Contraste;
- Botões grandes;
- Leitor de tela;
- Navegação simples;
- Sem swipe obrigatório.

---

# 23. Regras de Negócio

**RN01.** O acesso principal será destinado a usuários com idade igual ou superior a 50 anos.

**RN02.** O usuário deverá possuir conta autenticada para interagir.

**RN03.** O nível de verificação necessário para iniciar chat deverá ser definido após protótipo e análise de segurança.

**RN04.** Denúncia e bloqueio devem estar acessíveis no chat e no perfil.

**RN05.** Alertas de ML serão apresentados como indícios, não como acusações.

**RN06.** O usuário não será obrigado a compartilhar contatos pessoais, localização exata ou dados financeiros.

**RN07.** O BeyondTime não terá função de transferência de dinheiro no MVP.

**RN08.** O sistema deverá limitar spam e abuso.

**RN09.** Dados biométricos, caso utilizados, terão tratamento específico.

**RN10.** Um contato de confiança não poderá ler mensagens ou visualizar matches sem uma funcionalidade futura explícita e consentimento válido; isso não faz parte do MVP.

**RN11.** O usuário poderá bloquear outra pessoa imediatamente.

**RN12.** O usuário poderá excluir sua conta conforme regras de retenção legal e segurança.

---

# 24. Requisitos Funcionais

**RF01.** Permitir cadastro/login por e-mail e/ou telefone e oferecer **Entrar com Google** como opção simplificada.

**RF02.** Permitir criação e edição de perfil.

**RF03.** Permitir cadastro de interesses e intenção de conexão.

**RF04.** Permitir upload de fotos.

**RF05.** Implementar mecanismo de verificação definido para o MVP.

**RF06.** Listar perfis compatíveis.

**RF07.** Permitir demonstrar interesse ou passar.

**RF08.** Criar conexão/match quando as condições forem atendidas.

**RF09.** Permitir troca de mensagens.

**RF10.** Enviar texto para o serviço de classificação de risco quando aplicável.

**RF11.** Exibir alerta educativo quando o modelo/regra indicar risco relevante.

**RF12.** Permitir bloqueio.

**RF13.** Permitir denúncia.

**RF14.** Permitir gerenciar preferências de descoberta.

**RF15.** Permitir gerenciar notificações.

**RF16.** Registrar eventos relevantes de segurança.

**RF17.** Disponibilizar Central de Segurança.

**RF18.** Permitir exclusão da conta.

**RF19.** Permitir apresentação em áudio opcional.

**RF20.** Permitir descoberta orientada por intenção.

**RF21.** Exibir afinidades relevantes entre perfis.

**RF22.** Disponibilizar quebra-gelo por afinidade sem envio automático.

**RF23.** Disponibilizar orientações de Primeiro Encontro Seguro.

**RF24.** Permitir cadastro opcional de contato de confiança com permissões limitadas.

**RF25.** Exibir apenas indicadores objetivos de verificação, sem pontuação genérica de confiabilidade.


---

# 25. Requisitos Não Funcionais

**RNF01 — Acessibilidade:** interface deve seguir boas práticas de acessibilidade, incluindo WCAG na experiência web.

**RNF02 — Segurança:** HTTPS/WSS, autenticação segura, senhas com hash forte e autorização no backend.

**RNF03 — Privacidade:** aplicar princípios de LGPD e minimização.

**RNF04 — Desempenho:** chat deve permanecer responsivo mesmo com análise de risco.

**RNF05 — Disponibilidade:** falha do serviço de ML não deve impedir chat básico, salvo regra de segurança explicitamente definida.

**RNF06 — Observabilidade:** registrar erros e eventos críticos sem armazenar conteúdo sensível desnecessariamente.

**RNF07 — Escalabilidade:** arquitetura deve permitir separar chat/ML posteriormente sem exigir microserviços prematuros.

**RNF08 — Manutenibilidade:** módulos de domínio separados e documentados.

---

# 26. Arquitetura

## 26.1 Stack principal

### Frontend

- React Native;
- Expo;
- React Native Web;
- Google Sign-In / OAuth 2.0 + OpenID Connect;
- TypeScript;
- Expo Router;
- Zustand;
- TanStack Query;
- React Hook Form;
- Zod.

### Backend

- Java 21;
- Spring Boot 3;
- Spring Security;
- Spring Data JPA;
- PostgreSQL;
- SpringDoc OpenAPI.

### Tempo real

Opções a validar:

- WebSocket;
- STOMP/WebSocket;
- Serviço externo, somente se necessário.

### Machine Learning e Verificação

- Python;
- pandas;
- scikit-learn;
- OpenBiometrics para PoC de verificação facial, sujeito à validação de licença do código e modelos;
- YuNet para detecção;
- SFace para comparação facial 1:1;
- MiniFASNet para liveness passivo;
- InsightFace apenas como alternativa experimental, com revisão de licença dos modelos;
- FastAPI para servir o modelo, se necessário;
- joblib para artefatos simples de modelo.

### Infraestrutura

- Docker;
- Docker Compose;
- Object Storage para imagens;
- Redis opcional.

## 26.2 Arquitetura geral

```text
React Native / Web
        ↓
Spring Boot API
        │
        ├── Auth
        ├── Profiles
        ├── Discovery
        ├── Matches
        ├── Chat
        ├── Safety
        ├── Reports
        └── Notifications
        │
        ├────────→ PostgreSQL
        │
        ├────────→ Object Storage
        │
        └────────→ ML Safety API
                         ↓
                    scikit-learn
```

## 26.3 Modular Monolith

O backend principal continuará como **Modular Monolith**.

Módulos sugeridos:

```text
auth
users
profiles
verification
preferences
discovery
matches
chat
safety
reports
moderation
notifications
shared
```

O ML pode ser servido separadamente porque utiliza Python/scikit-learn, mas isso não significa transformar todo o backend em microserviços.

---

# 27. Modelo de Dados Conceitual

## users

```text
id
email
phone
password_hash
birth_date
status
created_at
updated_at
```

## profiles

```text
id
user_id
display_name
bio
city
state
verification_status
created_at
updated_at
```

## profile_photos

```text
id
profile_id
object_key
position
status
created_at
```

## interests

```text
id
name
```

## profile_interests

```text
profile_id
interest_id
```

## connection_intents

```text
id
name
```

Exemplos:

```text
RELATIONSHIP
FRIENDSHIP
COMPANIONSHIP
CHAT
ACTIVITIES
```

## discovery_preferences

```text
user_id
min_age
max_age
max_distance
intent_preferences
```

## likes

```text
id
from_user_id
to_user_id
created_at
```

## matches

```text
id
user_a_id
user_b_id
status
created_at
```

## conversations

```text
id
match_id
status
created_at
```

## messages

```text
id
conversation_id
sender_id
content
sent_at
status
```

## message_risk_analysis

```text
id
message_id
model_version
risk_score
risk_label
created_at
```

## blocks

```text
id
blocker_user_id
blocked_user_id
created_at
```

## reports

```text
id
reporter_user_id
reported_user_id
reason
description
status
created_at
```

## verification_attempts

```text
id
user_id
type
status
provider_reference
created_at
```

---

# 28. API — Endpoints Iniciais

## Auth

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/google
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

## Perfil

```text
GET    /api/v1/me/profile
PUT    /api/v1/me/profile
POST   /api/v1/me/photos
DELETE /api/v1/me/photos/{photoId}
```

## Descoberta

```text
GET /api/v1/discovery
POST /api/v1/profiles/{id}/interest
POST /api/v1/profiles/{id}/pass
```

## Matches

```text
GET    /api/v1/matches
DELETE /api/v1/matches/{id}
```

## Chat

```text
GET  /api/v1/conversations
GET  /api/v1/conversations/{id}/messages
POST /api/v1/conversations/{id}/messages
```

Tempo real poderá utilizar WebSocket.

## Segurança

```text
POST /api/v1/users/{id}/block
DELETE /api/v1/users/{id}/block
POST /api/v1/users/{id}/reports
GET  /api/v1/safety/guides
```

## Verificação

```text
POST /api/v1/verification/start
POST /api/v1/verification/complete
GET  /api/v1/verification/status
```

---

# 29. Fluxos Principais

## 29.1 Cadastro

```text
Instalar
   ↓
Criar conta
   ↓
Confirmar idade
   ↓
Criar perfil
   ↓
Selecionar interesses
   ↓
Selecionar intenção
   ↓
Adicionar fotos
   ↓
Verificação
   ↓
Descoberta
```

## 29.2 Conexão

```text
Descoberta
   ↓
Perfil compatível
   ↓
Demonstrar interesse
   ↓
Interesse recíproco
   ↓
Match
   ↓
Chat
```

## 29.3 Mensagem suspeita

```text
Mensagem enviada
      ↓
Backend
      ↓
ML / regras
      ↓
Risco baixo ─────→ entrega normal
      ↓
Risco relevante
      ↓
Alerta educativo
      ↓
Usuário decide:
continuar / bloquear / denunciar
```

## 29.4 Denúncia

```text
Perfil ou chat
     ↓
Denunciar
     ↓
Motivo
     ↓
Registro
     ↓
Moderação
     ↓
Ação conforme política
```

---

# 30. Telas Previstas

## Onboarding

1. Splash;
2. Apresentação do propósito;
3. Criar conta;
4. Login;
5. Confirmação de idade;
6. Termos e privacidade.

## Cadastro de perfil

7. Nome;
8. Cidade;
9. O que procura;
10. Interesses;
11. Biografia;
12. Fotos;
13. Verificação;
14. Cadastro concluído.

## Área principal

15. Descobrir;
16. Perfil detalhado;
17. Matches;
18. Chat;
19. Central de Segurança;
20. Meu Perfil;
21. Preferências;
22. Notificações;
23. Privacidade;
24. Contas bloqueadas;
25. Denúncia;
26. Ajuda.

---

# 31. Design System

Componentes reutilizáveis:

```text
Button
IconButton
AccessibleText
TextField
PasswordField
ProfileCard
ProfilePhoto
InterestChip
CompatibilityCard
VerificationBadge
SafetyAlert
ChatBubble
ReportModal
BlockDialog
BottomNavigation
EmptyState
LoadingState
ErrorState
```

Princípios:

- Tipografia confortável;
- Contraste alto;
- Espaçamento generoso;
- Botões claros;
- Não esconder ações importantes em gestos;
- Evitar telas visualmente carregadas;
- Linguagem adulta e respeitosa.

---

# 32. Pesquisa com Usuários

Entrevistar pessoas 50+ antes de fechar decisões.

## Perguntas essenciais

1. Você utiliza aplicativos para conhecer pessoas?
2. O que faria você confiar em um aplicativo desse tipo?
3. O que faria você desistir?
4. Você teria receio de perfis falsos?
5. Já recebeu pedidos de dinheiro de desconhecidos na internet?
6. Você prefere amizade, companhia, namoro ou múltiplas opções?
7. O que costuma observar primeiro em um perfil?
8. Você gosta de swipe ou prefere botões?
9. Áudio facilitaria a comunicação?
10. Como gostaria que o aplicativo avisasse sobre uma mensagem suspeita?
11. Você aceitaria fazer uma selfie para verificar o perfil?
12. Que informações não gostaria de compartilhar?
13. Quais aplicativos você já utiliza com facilidade?
14. Que tamanho de texto considera confortável?
15. O que faria você recomendar o BeyondTime?

## Regra de pesquisa

Não perguntar somente:

> “Você usaria?”

Observar comportamento em protótipos.

---

# 33. Personas

As personas finais serão construídas somente após pesquisa.

Possíveis padrões a investigar, sem tratá-los como personas definitivas:

- Pessoa 50+ tecnologicamente autônoma;
- Pessoa que utiliza tecnologia, mas valoriza orientação clara;
- Pessoa interessada principalmente em amizade;
- Pessoa interessada em relacionamento sério;
- Pessoa muito preocupada com golpes;
- Pessoa que prefere comunicação por áudio.

---

# 34. Testes

## Backend

- Unitários;
- Integração;
- Autorização;
- Regras de match;
- Bloqueio;
- Denúncia;
- Chat.

## Frontend

- Componentes;
- Fluxos;
- Acessibilidade;
- Estados de erro;
- Formulários.

## Segurança

- Tentativas de acesso indevido;
- IDOR;
- Rate limiting;
- Upload malicioso;
- Spam;
- enumeração de usuários;
- proteção de WebSocket;
- abuso de denúncia.

## ML

- Dataset separado treino/teste;
- Métricas;
- Falsos positivos;
- Falsos negativos;
- Testes com frases ambíguas;
- Versionamento.

## Usabilidade

- Cadastro;
- Encontrar perfil;
- Demonstrar interesse;
- Iniciar conversa;
- Bloquear;
- Denunciar;
- Entender alerta de segurança.

---

# 35. Documentação do Projeto

Estrutura recomendada:

```text
README.md
CHANGELOG.md
CONTRIBUTING.md

docs/
├── 01-product-overview.md
├── 02-user-research.md
├── 03-personas.md
├── 04-requirements.md
├── 05-business-rules.md
├── 06-architecture.md
├── 07-database.md
├── 08-api.md
├── 09-chat.md
├── 10-safety.md
├── 11-machine-learning.md
├── 12-accessibility.md
├── 13-lgpd-privacy.md
├── 14-testing.md
├── 15-deployment.md
├── 16-open-source-licenses.md
└── adr/
```

Definition of Done:

```text
Código
+ testes
+ documentação
= concluído
```

---

# 36. Roadmap Recomendado

## Fase 1 — Descoberta

1. Entrevistas;
2. Pesquisa de concorrentes;
3. Personas;
4. Jornada;
5. Protótipos.

## Fase 2 — Validação

6. Teste de cadastro;
7. Teste de descoberta;
8. Teste de chat;
9. Teste dos alertas de segurança;
10. Revisão do MVP.

## Fase 3 — Fundação técnica

11. Repositórios;
12. Docker;
13. PostgreSQL;
14. Spring Boot;
15. React Native/Expo;
16. Autenticação tradicional + Entrar com Google.

## Fase 4 — Produto básico

17. Perfil;
18. Fotos;
19. Interesses;
20. Descoberta;
21. Likes;
22. Matches.

## Fase 5 — Comunicação e segurança

23. Chat;
24. Bloqueio;
25. Denúncia;
26. Central de Segurança;
27. Verificação.

## Fase 6 — Machine Learning

28. Dataset;
29. Baseline;
30. Treinamento;
31. Avaliação;
32. API do modelo;
33. Integração com chat;
34. Teste de alertas.

## Fase 7 — Finalização

35. Acessibilidade;
36. Testes;
37. Segurança;
38. Documentação;
39. Deploy;
40. Apresentação.

---

# 37. Riscos do Projeto

## Golpes e engenharia social

Mitigação:

- Educação;
- ML;
- denúncias;
- bloqueio;
- verificação;
- moderação.

## Perfis falsos

Mitigação:

- Telefone;
- selfie;
- liveness quando viável;
- denúncia.

## Falsos positivos do ML

Mitigação:

- Alertas educativos;
- não acusar;
- métricas;
- limiar validado;
- possibilidade de continuar.

## Abuso de denúncias

Mitigação:

- Não suspender permanentemente apenas por contagem;
- avaliar contexto;
- histórico;
- revisão.

## Vazamento de dados

Mitigação:

- Minimização;
- criptografia em trânsito;
- controles de acesso;
- logs seguros;
- política de retenção.

## Escopo excessivo

Mitigação:

- Priorizar MVP;
- não construir videochamada/pagamentos/eventos completos inicialmente;
- validar antes de expandir.

---

# 38. Critérios de Sucesso do MVP

O MVP será considerado tecnicamente demonstrável quando permitir:

1. Criar conta 50+;
2. Criar perfil;
3. Adicionar interesses;
4. Passar por verificação definida;
5. Descobrir pessoas;
6. Demonstrar interesse;
7. Gerar match;
8. Conversar;
9. Receber alerta educativo em cenário de risco simulado/real do modelo;
10. Bloquear;
11. Denunciar;
12. Utilizar a interface com boa acessibilidade.
13. Demonstrar a verificação facial/ML com componentes cuja licença tenha sido documentada.

Indicadores de produto para pesquisa:

- Taxa de conclusão do cadastro;
- Tempo para completar perfil;
- Taxa de compreensão dos alertas;
- Facilidade para bloquear/denunciar;
- Percepção de confiança;
- Percepção de acessibilidade;
- Qualidade percebida das recomendações.

---

# 39. Resumo Executivo

O **BeyondTime** substitui integralmente o antigo conceito do BemIdade.

O projeto agora será uma plataforma 50+ de:

```text
CONEXÕES
   +
AFINIDADE
   +
ACESSIBILIDADE
   +
SEGURANÇA
```

O diferencial não será apenas permitir que pessoas maduras deem “match”.

O objetivo é construir uma experiência na qual:

- O usuário entende quem está conhecendo;
- A afinidade tem importância;
- A interface é confortável;
- Há mecanismos de verificação;
- Existem bloqueio e denúncia acessíveis;
- O ML ajuda a identificar possíveis sinais de fraude;
- A tecnologia não tira a autonomia do usuário.

> **BeyondTime — Conexões reais não têm idade. Segurança para viver novas histórias.**

# 39. LGPD, Privacidade, Segurança e Conformidade

> **Status:** requisitos de produto e engenharia para o projeto acadêmico. Antes de lançamento comercial, os documentos jurídicos e as bases legais deverão ser revisados por profissional jurídico/privacidade responsável.

O BeyondTime trata dados pessoais de relacionamento, comunicação, fotos e, caso a verificação facial seja ativada, **dados biométricos**, que são dados pessoais sensíveis pela LGPD.

A conformidade deverá ser incorporada à arquitetura desde o início, e não adicionada apenas no final.

## 39.1 Princípios LGPD aplicados ao produto

O tratamento deverá seguir, entre outros, os princípios de:

- Finalidade;
- Adequação;
- Necessidade/minimização;
- Livre acesso;
- Qualidade dos dados;
- Transparência;
- Segurança;
- Prevenção;
- Não discriminação;
- Responsabilização e prestação de contas.

Regra de engenharia:

```text
Precisamos realmente deste dado?
        ↓
NÃO → não coletar
SIM
        ↓
Qual a finalidade?
        ↓
Qual a base legal?
        ↓
Por quanto tempo?
        ↓
Quem pode acessar?
        ↓
Como excluir/anonimizar?
```

## 39.2 Inventário inicial de dados

| Categoria | Exemplos | Sensibilidade | Finalidade inicial |
|---|---|---|---|
| Conta | nome, e-mail, telefone, identificadores OAuth | pessoal | autenticação e conta |
| Perfil | idade/data de nascimento, cidade aproximada, bio, interesses | pessoal | perfil e descoberta |
| Fotos/áudio | fotos do perfil, apresentação em áudio | pessoal | apresentação e interação |
| Preferências | intenção, faixa etária, interesses | pode revelar informações pessoais | recomendação |
| Chat | mensagens e metadados | pessoal e potencialmente sensível | comunicação e segurança |
| Segurança | bloqueios, denúncias, sinais de abuso | pessoal | proteção e moderação |
| Biometria | selfie, template/embedding facial quando utilizado | **sensível** | verificação 1:1 |
| Técnicos | IP, dispositivo, logs, sessão | pessoal quando identificável | segurança e operação |
| Localização | região/distância aproximada, se autorizada | pessoal | descoberta |

A tabela deverá evoluir para um **Registro das Operações de Tratamento (ROPA/inventário)** com finalidade, base legal, retenção, compartilhamento, controles e responsável.

## 39.3 Bases legais

A equipe não deverá aplicar “consentimento” a tudo automaticamente.

Cada finalidade deverá possuir análise e base legal documentada conforme a LGPD.

Para dados pessoais comuns, avaliar as hipóteses aplicáveis do art. 7º.

Para dados pessoais sensíveis, incluindo biometria, avaliar especificamente as hipóteses do art. 11 e documentar a justificativa.

**Nenhuma base legal definitiva para biometria será presumida neste documento.** A definição deverá ocorrer após desenho final do fluxo e revisão jurídica/privacidade.

## 39.4 Biometria e reconhecimento facial

Como o BeyondTime pretende realizar verificação facial 1:1:

- Usar apenas para finalidade claramente informada;
- Não realizar reconhecimento em massa;
- Não procurar usuários em fotos públicas;
- Não identificar terceiros;
- Não reutilizar biometria para publicidade;
- Não inferir raça, etnia, saúde, orientação sexual ou outros atributos sensíveis;
- Não usar idade facial estimada como prova de idade;
- Implementar liveness/anti-spoofing;
- Avaliar desempenho e vieses;
- Oferecer processo alternativo/revisão quando tecnicamente e juridicamente adequado;
- Definir retenção mínima de selfie e embeddings;
- Criptografar dados sensíveis;
- Restringir acesso administrativo;
- Registrar acesso e operação;
- Proibir uso do dataset biométrico para treinar novos modelos sem finalidade/base legal própria.

A ANPD mantém biometria como tema regulatório relevante; portanto, a implementação deverá ser revisada quando novas normas/orientações forem publicadas.

## 39.5 RIPD — Relatório de Impacto

Antes de colocar biometria e análise automatizada em produção, elaborar um **Relatório de Impacto à Proteção de Dados Pessoais (RIPD)**.

O RIPD deverá documentar pelo menos:

- Dados tratados;
- Finalidades;
- Fluxos;
- Hipóteses legais;
- Necessidade e proporcionalidade;
- Tecnologias/modelos;
- Compartilhamentos;
- Retenção;
- Riscos;
- Probabilidade e impacto;
- Salvaguardas;
- Riscos residuais;
- Processo de revisão.

O BeyondTime reúne fatores que justificam atenção reforçada: biometria, tecnologia automatizada, público 50+ e possibilidade de tratamento de conteúdo sensível.

## 39.6 Direitos do titular

Criar dentro do produto:

```text
PRIVACIDADE E MEUS DADOS

[ Ver meus dados ]
[ Corrigir meus dados ]
[ Baixar/solicitar meus dados ]
[ Gerenciar consentimentos ]
[ Gerenciar permissões ]
[ Excluir minha conta ]
[ Falar sobre privacidade ]
```

O processo deverá suportar, conforme aplicável:

- Confirmação do tratamento;
- Acesso;
- Correção;
- Informação sobre compartilhamento;
- Revogação de consentimento;
- Eliminação quando cabível;
- Anonimização/bloqueio quando cabível;
- Portabilidade conforme regulamentação aplicável;
- Oposição quando cabível;
- Informações e revisão sobre decisões automatizadas nos termos da LGPD.

## 39.7 Exclusão de conta

A exclusão deverá existir **dentro do aplicativo**.

Para Google Play, também deverá existir recurso web acessível para solicitar exclusão.

Fluxo:

```text
Configurações
   ↓
Conta
   ↓
Excluir minha conta
   ↓
Explicar consequências
   ↓
Reautenticação
   ↓
Confirmação
   ↓
Processo de exclusão
```

Não tratar “desativar” como equivalente a excluir.

Dados que precisarem ser mantidos por obrigação legítima de segurança, prevenção a fraude ou exigência legal deverão ter motivo e prazo claramente documentados na Política de Privacidade.

## 39.8 Retenção

Criar uma matriz de retenção antes da produção.

Exemplo de estrutura, sem prazos arbitrários:

| Dado | Retenção | Evento inicial | Motivo | Destino |
|---|---|---|---|---|
| Perfil | A definir | criação | serviço | excluir/anonimizar |
| Mensagens | A definir | envio | comunicação/segurança | excluir/anonimizar |
| Selfie biométrica | **mínimo necessário, a definir** | verificação | verificação | exclusão segura |
| Embedding facial | **mínimo necessário, a definir** | verificação | verificação | exclusão segura |
| Logs de segurança | A definir | evento | segurança | exclusão |
| Registro de incidente LGPD | conforme norma aplicável | incidente | compliance | exclusão ao fim do prazo |

Não definir retenção “para sempre”.

## 39.9 Incidentes de segurança

Criar Plano de Resposta a Incidentes:

```text
DETECTAR
  ↓
CONTER
  ↓
PRESERVAR EVIDÊNCIAS
  ↓
AVALIAR DADOS E IMPACTO
  ↓
MITIGAR
  ↓
COMUNICAR QUANDO EXIGIDO
  ↓
CORRIGIR
  ↓
LIÇÕES APRENDIDAS
```

A Resolução CD/ANPD nº 15/2024 deverá ser usada como referência para comunicação de incidentes com dados pessoais.

O controlador deverá manter os registros de incidentes pelo período exigido pela regulamentação vigente.

## 39.10 Encarregado e canal de privacidade

Antes de produção:

- Definir controlador e operadores;
- Identificar fornecedores/suboperadores;
- Definir responsabilidades;
- Avaliar necessidade/forma de atuação do encarregado conforme regulamentação;
- Disponibilizar canal de contato de privacidade;
- Criar processo interno para solicitações de titulares.

## 39.11 Compartilhamento e fornecedores

Todo fornecedor/SDK deverá entrar em inventário:

```text
Fornecedor
↓
Que dado recebe?
↓
Por quê?
↓
Onde processa?
↓
Por quanto tempo?
↓
Suboperadores?
↓
Contrato/DPA?
↓
Transferência internacional?
↓
Como excluir?
```

Isso inclui:

- Google Sign-In;
- Push notifications;
- Object Storage;
- Analytics;
- Crash reporting;
- E-mail/SMS;
- Infraestrutura;
- Serviços futuros.

Evitar SDKs de publicidade comportamental no MVP.

## 39.12 Transferência internacional

Caso dados sejam enviados ou hospedados fora do Brasil, documentar:

- País/região;
- Fornecedor;
- Dados transferidos;
- Finalidade;
- Mecanismo jurídico aplicável;
- Salvaguardas contratuais e técnicas.

## 39.13 Decisões automatizadas e ML

O detector de possível golpe deverá ser um **sistema de apoio à segurança**.

Não deverá:

- Acusar automaticamente alguém de crime;
- Banir por uma única classificação;
- Bloquear conversa apenas por um score sem regra validada;
- Criar perfil discriminatório;
- Utilizar conteúdo para finalidade incompatível.

Deverá:

- Versionar modelos;
- Registrar métricas;
- Avaliar falsos positivos/negativos;
- Manter explicação operacional;
- Permitir revisão humana em decisões relevantes;
- Registrar a lógica/regra que levou a ações de moderação;
- Manter canal de contestação quando houver impacto relevante.

------------------------------------------------------------------------

# 40. Norma de Segurança do Aplicativo, Site e API

O BeyondTime adotará **security by design** e **privacy by design**.

Referências técnicas principais:

- OWASP MASVS para aplicativo móvel;
- OWASP MASTG para testes móveis;
- OWASP ASVS 5.x para site/backend/API;
- Boas práticas oficiais Android;
- Regras de privacidade e segurança do Google Play;
- App Review Guidelines da Apple.

## 40.1 Autenticação e sessão

- OAuth 2.0/OpenID Connect para Google;
- Nunca receber senha da conta Google;
- Senhas próprias com hash moderno (Argon2id ou configuração segura equivalente);
- Tokens de curta duração;
- Refresh token protegido e rotacionável;
- Revogação de sessão;
- Lista/gerenciamento de sessões quando viável;
- Reautenticação para ações sensíveis;
- Proteção contra credential stuffing;
- Rate limiting;
- Não revelar se determinado e-mail existe de forma desnecessária;
- MFA opcional/futuro para contas administrativas.

## 40.2 Autorização

Toda autorização deverá ser validada no backend.

Nunca confiar em:

```text
"o botão não aparece no frontend"
```

como mecanismo de segurança.

Testar:

- IDOR/BOLA;
- Acesso horizontal;
- Escalada vertical;
- Acesso a conversas de terceiros;
- Acesso a fotos privadas;
- Acesso a denúncias;
- Funções administrativas.

## 40.3 Transporte e armazenamento

- HTTPS/TLS em produção;
- WSS para WebSocket;
- Dados sensíveis protegidos em repouso;
- Segredos fora do repositório;
- Tokens em armazenamento seguro no dispositivo;
- Não salvar token sensível em logs;
- Banco sem exposição pública desnecessária;
- Backups criptografados;
- Testes periódicos de restauração.

## 40.4 Upload de fotos e áudio

- Validar MIME real;
- Limitar tamanho;
- Gerar nomes internos;
- Não confiar no nome enviado;
- Remover metadados EXIF quando apropriado;
- Evitar exposição de localização em fotos;
- Object Storage privado por padrão;
- URLs assinadas/temporárias quando necessário;
- Scanner/moderação;
- Bloquear formatos inesperados;
- Rate limiting.

## 40.5 Chat e WebSocket

- Autenticar conexão;
- Autorizar cada conversa;
- Validar payload;
- Limitar tamanho de mensagem;
- Rate limiting;
- Anti-spam;
- Proteção contra flood;
- Bloqueio com efeito imediato;
- Não permitir que bloqueado continue enviando;
- Sanitização/escape na renderização web;
- Política segura para links.

## 40.6 API

- Validação de entrada;
- DTOs;
- Paginação;
- Limites;
- CORS restritivo;
- CSRF quando aplicável à arquitetura;
- Rate limiting;
- Tratamento de erros sem stack trace público;
- IDs não previsíveis quando isso reduzir exposição;
- Logs de auditoria para ações críticas;
- Princípio do menor privilégio.

## 40.7 Mobile

Seguir os grupos de controle do OWASP MASVS, incluindo:

- Storage;
- Cryptography;
- Authentication;
- Network;
- Platform;
- Code;
- Resilience;
- Privacy.

Solicitar apenas permissões necessárias.

Preferir localização aproximada quando a localização exata não for essencial.

## 40.8 Painel administrativo e moderação

Criar painel administrativo separado da experiência do usuário.

```text
BEYONDTIME ADMIN

👥 Usuários
🚨 Denúncias
🖼️ Conteúdo denunciado
🤖 Alertas do ML
🛡️ Verificações em revisão
⛔ Suspensões
📊 Métricas operacionais
```

Controles:

- RBAC;
- MFA para administradores;
- Sessões mais restritas;
- Auditoria de ações;
- Motivo obrigatório para ações sensíveis;
- Acesso mínimo necessário;
- Proibir consulta livre de chats sem motivo operacional autorizado;
- Registro de visualização de dados altamente sensíveis;
- Separação de funções quando o projeto crescer.

## 40.9 Sistema interno de sinais de risco

Poderá existir um score/sinal interno para priorização de moderação:

```text
Conta nova
+ denúncias
+ spam
+ bloqueios
+ mensagens classificadas como suspeitas
+ falhas de verificação
        ↓
PRIORIZAÇÃO DE REVISÃO
```

Esse mecanismo:

- Não será apresentado como “nota de caráter”;
- Não deverá gerar banimento automático apenas pelo score;
- Deverá ter critérios documentados;
- Deverá ser testado contra abuso de denúncias;
- Deverá permitir revisão humana.

## 40.10 Rate limiting e anti-bot

Aplicar limites por contexto:

- Login;
- Recuperação;
- Cadastro;
- Likes;
- Mensagens;
- Upload;
- Denúncias;
- Verificação facial;
- Endpoints administrativos.

Adicionar detecção de abuso progressivamente, evitando bloquear usuários legítimos por dificuldade de uso.

## 40.11 Observabilidade open source

Stack sugerida:

```text
Prometheus
↓
métricas

Grafana
↓
dashboards

Loki
↓
logs
```

Regras:

- Não registrar senha;
- Não registrar token;
- Evitar conteúdo integral de chat em logs;
- Minimizar PII;
- Aplicar retenção;
- Controlar acesso aos dashboards.

## 40.12 DevSecOps

Pipeline sugerido:

```text
git push
   ↓
GitHub Actions
   ├── testes frontend
   ├── testes Spring Boot
   ├── testes Python
   ├── SAST
   ├── dependency scan
   ├── container scan
   └── build
```

Ferramentas open source a avaliar:

- Semgrep Community Edition para SAST;
- Trivy para containers/dependências/configurações;
- OWASP ZAP para DAST da aplicação/API;
- OWASP Dependency-Check quando aplicável.

Ferramentas deverão ter suas licenças revisadas segundo a política open source do projeto.

## 40.13 Ambientes

```text
LOCAL
↓
DEVELOPMENT
↓
STAGING
↓
PRODUCTION
```

Regras:

- Bancos separados;
- Credenciais separadas;
- Não copiar dados pessoais reais para desenvolvimento;
- Dados sintéticos em testes sempre que possível;
- Feature flags para funcionalidades experimentais;
- ML/biometria testados com datasets adequados e governados.

## 40.14 Backup e continuidade

- Backup automatizado;
- Criptografia;
- Retenção definida;
- Cópia isolada quando apropriado;
- Teste de restauração;
- RPO/RTO definidos antes de produção;
- Procedimento de recuperação documentado.

------------------------------------------------------------------------

# 41. Requisitos de Google Play e App Store

## 41.1 Google Play

Antes da publicação:

- Política de Privacidade pública e acessível;
- Política também acessível dentro do app;
- Formulário **Data safety** coerente com o comportamento real;
- Declarar dados coletados/compartilhados, inclusive por SDKs;
- Processo de exclusão de conta dentro do app;
- Recurso web externo para solicitar exclusão;
- Excluir dados associados quando aplicável;
- Informar retenções legítimas;
- Solicitar somente permissões necessárias;
- Manter disclosures e consentimentos coerentes com as funcionalidades.

## 41.2 Apple App Store

Antes da publicação:

- Política de Privacidade acessível;
- Explicar coleta, uso, compartilhamento, retenção e exclusão;
- Exclusão de conta iniciável dentro do app;
- Pedir permissões apenas quando necessárias;
- Oferecer alternativas quando possível;
- Revisar as regras de login social.

Como o BeyondTime pretende oferecer Google Sign-In, a equipe deverá revisar a regra vigente de login da App Store e, quando aplicável, oferecer uma opção equivalente que satisfaça os requisitos da Apple — normalmente **Sign in with Apple** é a solução adotada.

------------------------------------------------------------------------

# 42. Termos de Uso — Rascunho V2

> Este é um rascunho de produto para o projeto acadêmico. Antes de publicação real, deverá passar por revisão jurídica e ser preenchido com razão social/nome do controlador, CNPJ quando aplicável, endereço/canal de contato, foro e demais informações reais.

**Última atualização:** a definir antes da publicação.

## 42.1 Aceitação

Ao criar uma conta e utilizar o BeyondTime, o usuário declara ter lido e aceitado estes Termos de Uso e ter ciência da Política de Privacidade.

Aceitar os Termos não deverá ser confundido com consentir genericamente com todo tratamento de dados. Consentimentos específicos, quando necessários, serão apresentados separadamente.

## 42.2 Finalidade do BeyondTime

O BeyondTime é uma plataforma voltada principalmente a pessoas com 50 anos ou mais para criação de conexões sociais, amizades, companhias, conversas e relacionamentos com base em interesses e afinidades.

O BeyondTime não garante:

- Formação de relacionamento;
- Compatibilidade perfeita;
- Identidade absoluta de qualquer usuário;
- Ausência de fraude;
- Segurança absoluta em encontros presenciais.

## 42.3 Elegibilidade

O produto é destinado ao público definido pelas regras vigentes do BeyondTime, atualmente planejado como 50+.

A plataforma poderá solicitar informações ou etapas de verificação para aplicar essa regra.

A verificação facial, quando disponível, não será utilizada como estimativa automática definitiva da idade.

## 42.4 Conta e autenticação

O usuário é responsável por manter seus meios de acesso protegidos.

O BeyondTime poderá oferecer:

- Login próprio;
- Login com Google;
- Outros provedores autorizados futuramente.

O login Google autentica uma conta de acesso, mas não significa que o Google verificou ou endossou o perfil BeyondTime.

## 42.5 Perfil e conteúdo do usuário

O usuário é responsável pelo conteúdo que publica ou envia.

É proibido:

- Se passar deliberadamente por outra pessoa;
- Publicar conteúdo ilegal;
- Assediar, ameaçar ou perseguir;
- Praticar fraude;
- Solicitar senhas ou códigos de autenticação;
- Utilizar a plataforma para golpes financeiros;
- Enviar spam;
- Distribuir malware ou links maliciosos;
- Explorar vulnerabilidades para prejudicar usuários ou o serviço;
- Publicar imagens de terceiros sem direito/autorização aplicável.

## 42.6 Segurança financeira

O BeyondTime não é instituição financeira e não oferece transferência de dinheiro no MVP.

Usuários não devem tratar selo de verificação como garantia financeira ou de caráter.

Alertas de risco são preventivos e podem conter erros.

## 42.7 Verificação de perfil

O BeyondTime poderá disponibilizar mecanismos de verificação, incluindo selfie e comparação facial 1:1.

O selo significa somente que o perfil concluiu o processo de verificação definido pela plataforma.

Ele não constitui:

- Certificado de boa conduta;
- Garantia de identidade civil absoluta;
- Garantia contra fraude;
- Recomendação para enviar dinheiro;
- Garantia de segurança presencial.

## 42.8 Machine Learning e alertas

O BeyondTime poderá utilizar modelos para detectar sinais de mensagens potencialmente suspeitas e apoiar segurança/moderação.

Os resultados são probabilísticos.

O sistema deverá evitar acusações definitivas baseadas somente em classificação automatizada.

Quando uma ação relevante depender de tratamento automatizado, serão observados os direitos aplicáveis previstos na LGPD.

## 42.9 Denúncias, bloqueios e moderação

Usuários poderão bloquear e denunciar contas.

O BeyondTime poderá:

- Investigar denúncias;
- Limitar funcionalidades;
- Remover conteúdo;
- Suspender contas;
- Encerrar contas em situações justificadas.

Ações relevantes deverão seguir critérios internos documentados, proporcionalidade e, quando apropriado, revisão.

Denúncias falsas ou coordenadas para prejudicar terceiros também poderão constituir abuso.

## 42.10 Encontros presenciais

O BeyondTime poderá fornecer orientações educativas de segurança, mas não supervisiona encontros presenciais.

Usuários devem avaliar suas próprias decisões e adotar cuidados apropriados.

## 42.11 Contato de confiança

Se ativado, o contato de confiança terá apenas as permissões expressamente apresentadas ao usuário.

Por padrão, ele não poderá:

- Ler chats;
- Ver matches;
- Editar perfil;
- Monitorar localização.

## 42.12 Propriedade intelectual

A marca, interface, código próprio e materiais produzidos pelo BeyondTime permanecem sujeitos aos respectivos direitos e licenças.

Componentes open source utilizados pelo projeto continuarão sujeitos às licenças de seus autores.

Conteúdo do usuário não deverá ser tratado como propriedade irrestrita do BeyondTime. As permissões necessárias para hospedar, processar e exibir conteúdo deverão ser limitadas à prestação e segurança do serviço, conforme os documentos definitivos.

## 42.13 Privacidade

O tratamento de dados pessoais será descrito na Política de Privacidade.

Estes Termos não substituem a Política de Privacidade.

## 42.14 Disponibilidade

O serviço poderá passar por manutenção, atualização ou indisponibilidade.

Não prometer disponibilidade absoluta.

## 42.15 Encerramento e exclusão

O usuário poderá solicitar exclusão da conta pelos mecanismos disponibilizados.

O BeyondTime poderá encerrar contas por violações graves ou reiteradas, respeitando obrigações legais e políticas internas aplicáveis.

## 42.16 Alterações

Mudanças materiais nos Termos deverão ser comunicadas de maneira apropriada.

Quando uma alteração exigir nova manifestação do usuário, o produto deverá solicitar essa manifestação.

## 42.17 Contato

Antes da publicação preencher:

```text
Controlador/empresa: [A DEFINIR]
CNPJ: [A DEFINIR]
Canal de suporte: [A DEFINIR]
Canal de privacidade: [A DEFINIR]
Endereço: [A DEFINIR]
```

------------------------------------------------------------------------

# 43. Política de Privacidade — Rascunho V1

> Documento separado dos Termos de Uso. Este rascunho deverá ser revisado juridicamente antes de publicação.

## 43.1 Quem controla os dados

Preencher antes da produção:

```text
Controlador: [A DEFINIR]
CNPJ: [A DEFINIR]
Contato de privacidade: [A DEFINIR]
Encarregado/canal: [A DEFINIR CONFORME REGRA APLICÁVEL]
```

## 43.2 Dados que poderemos tratar

Dependendo das funcionalidades ativadas:

- Cadastro e autenticação;
- Perfil e preferências;
- Fotos e áudio;
- Mensagens;
- Bloqueios e denúncias;
- Dados de segurança e dispositivo;
- Região/localização aproximada quando autorizada;
- Dados de verificação;
- Dados biométricos quando a verificação facial for utilizada;
- Interações necessárias para recomendações;
- Registros de suporte.

## 43.3 Para que usamos

Finalidades deverão ser informadas de maneira granular, incluindo:

- Criar e proteger a conta;
- Exibir o perfil;
- Recomendar conexões;
- Permitir chat;
- Verificar perfil;
- Prevenir fraude e abuso;
- Moderar denúncias;
- Enviar notificações escolhidas;
- Operar e proteger infraestrutura;
- Cumprir obrigações legais;
- Atender direitos dos titulares.

## 43.4 Biometria

Quando utilizada, a biometria terá aviso específico antes da coleta.

Esse aviso deverá informar:

- Finalidade;
- Dado processado;
- Tecnologia/fluxo relevante;
- Retenção;
- Compartilhamentos;
- Base legal aplicável;
- Consequências da não utilização quando houver;
- Canal para dúvidas/direitos.

## 43.5 Compartilhamento

A política final deverá listar categorias reais de destinatários e fornecedores.

Não usar texto genérico para ocultar compartilhamentos.

## 43.6 Segurança

O BeyondTime adotará medidas técnicas e administrativas proporcionais ao risco, incluindo controle de acesso, criptografia quando apropriada, proteção de sessão, monitoramento, backups e processo de resposta a incidentes.

Nenhum sistema deverá ser descrito como 100% seguro.

## 43.7 Retenção e exclusão

Cada categoria terá prazo ou critério de retenção documentado.

Após atingir a finalidade, os dados deverão ser eliminados ou anonimizados quando aplicável, salvo retenção legitimamente necessária.

## 43.8 Direitos

Disponibilizar processo para exercício dos direitos previstos na LGPD, incluindo acesso, correção, informações, eliminação quando cabível, revogação de consentimento e demais direitos aplicáveis.

## 43.9 Decisões automatizadas

Explicar de maneira compreensível os usos relevantes de ML que afetem interesses do usuário e disponibilizar os mecanismos exigidos pela legislação.

## 43.10 Transferências internacionais

A política deverá informar transferências internacionais reais e as salvaguardas aplicáveis.

## 43.11 Alterações

Mudanças relevantes serão comunicadas adequadamente e a data de atualização será mantida visível.

------------------------------------------------------------------------

# 44. Checklist de Conformidade Antes da Produção

## Jurídico/privacidade

- ⬜ Identificar controlador;
- ⬜ Mapear operadores/suboperadores;
- ⬜ Completar inventário/ROPA;
- ⬜ Definir base legal por finalidade;
- ⬜ Elaborar RIPD para biometria/alto risco;
- ⬜ Definir matriz de retenção;
- ⬜ Criar Política de Privacidade final;
- ⬜ Revisar Termos de Uso;
- ⬜ Criar canal de direitos;
- ⬜ Definir encarregado/canal conforme regulamentação;
- ⬜ Mapear transferências internacionais;
- ⬜ Criar plano de incidentes;
- ⬜ Documentar consentimentos quando aplicáveis.

## Segurança

- ⬜ Threat modeling;
- ⬜ OWASP MASVS checklist;
- ⬜ OWASP ASVS 5.x checklist;
- ⬜ SAST;
- ⬜ DAST;
- ⬜ Dependency/container scan;
- ⬜ Testes de IDOR/BOLA;
- ⬜ Testes WebSocket;
- ⬜ Testes de rate limiting;
- ⬜ Testes de upload;
- ⬜ Testes de recuperação de conta;
- ⬜ Testes de exclusão;
- ⬜ Testes de backup/restauração;
- ⬜ Pentest antes de produção.

## Google Play

- ⬜ Política de Privacidade publicada;
- ⬜ Data safety preenchido;
- ⬜ Exclusão no app;
- ⬜ Página web de exclusão;
- ⬜ Permissões mínimas;
- ⬜ Revisar políticas atuais antes do envio.

## App Store

- ⬜ Política de Privacidade;
- ⬜ Exclusão dentro do app;
- ⬜ Privacy disclosures;
- ⬜ Revisar login social/Sign in with Apple;
- ⬜ Permissões mínimas;
- ⬜ Revisar App Review Guidelines atuais antes do envio.

------------------------------------------------------------------------

# 45. Referências Normativas e Técnicas

Consultar sempre as versões vigentes antes de lançamento:

1. Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD), texto atualizado.
2. ANPD — Direitos dos Titulares.
3. ANPD — Regulamentações vigentes.
4. Resolução CD/ANPD nº 15/2024 — Comunicação de Incidente de Segurança.
5. Resolução CD/ANPD nº 18/2024 — Atuação do encarregado.
6. ANPD — Orientações sobre RIPD.
7. ANPD — materiais e agenda regulatória sobre biometria/reconhecimento facial.
8. OWASP MASVS / MASTG.
9. OWASP ASVS 5.x.
10. Android Developers — Security Best Practices.
11. Google Play — User Data / Data Safety / Account Deletion.
12. Apple — App Review Guidelines e Account Deletion.
