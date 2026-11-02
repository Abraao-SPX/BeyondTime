# Site do BeyondTime

Site institucional estático, responsivo e em português. Todos os arquivos necessários estão nesta pasta. Não exige Node.js, instalação de dependências, banco de dados ou compilação.

O conteúdo apresenta o aplicativo em desenvolvimento. Não há cadastro, lista de espera fictícia, coleta de e-mail, métricas inventadas ou integração com a API de biometria.

## Visualizar localmente

Abra `index.html` no navegador ou execute, dentro desta pasta:

```bash
python3 -m http.server 8085 --bind 127.0.0.1
```

Acesse **http://localhost:8085**. Esse comando serve apenas para visualização local.

## Publicar com Docker

Copie a pasta `site` para seu servidor e execute dentro dela:

```bash
docker compose -p beyondtime-site up -d --build
```

O site será servido na porta **8085**. O comando usa o `compose.yml` desta pasta; não depende do Docker Compose da raiz do BeyondTime.

Para escolher outra porta:

```bash
SITE_PORT=8090 docker compose -p beyondtime-site up -d --build
```

Verifique o estado:

```bash
docker compose -p beyondtime-site ps
```

Se o servidor já utiliza Nginx, Caddy, Traefik ou outro proxy para HTTPS, encaminhe o domínio escolhido para a porta do site. Mantenha a configuração atual da API separada. O container incluído serve HTTP; o certificado HTTPS fica no proxy de entrada.

Para atualizar após copiar uma nova versão dos arquivos:

```bash
docker compose -p beyondtime-site up -d --build
```

## Publicar em hospedagem estática ou Nginx existente

Envie somente os seguintes arquivos para a pasta pública configurada para o domínio:

```text
index.html
styles.css
script.js
config.js
assets/
```

Preserve a estrutura de diretórios. Os caminhos são relativos, permitindo servir também em uma subpasta, como `https://seu-dominio.com/beyondtime/`.

Os arquivos `Dockerfile`, `compose.yml`, `nginx.conf`, `README.md` e `.validation/` não precisam ir para a pasta pública. No modo Docker, a imagem já copia somente os arquivos necessários.

## Configurar o acesso ao aplicativo

Edite `config.js` quando houver um link oficial de acesso:

```javascript
window.BEYONDTIME_CONFIG = Object.freeze({
  appUrl: 'https://endereco-oficial-do-aplicativo',
  contactEmail: 'contato@seu-dominio.com',
});
```

Os endereços acima são exemplos e devem ser substituídos. `appUrl` aceita apenas HTTPS. Com o campo vazio, o botão leva à explicação de pré-lançamento. Com uma URL válida, ele passa a levar ao aplicativo, e os textos de disponibilidade correspondentes são atualizados.

`contactEmail` é opcional. Quando preenchido com um endereço válido, o rodapé exibe “Fale com a equipe”. Não há envio de mensagens por servidor: o link abre o aplicativo de e-mail do visitante.

Ao lançar o produto, revise também os demais textos em `index.html`, especialmente os recursos descritos como em desenvolvimento. Publique os termos e a política de privacidade reais do aplicativo antes de abrir cadastros.

## Estrutura e edição

| Arquivo | Finalidade |
| --- | --- |
| `index.html` | Conteúdo, metadados, seções e perguntas frequentes |
| `styles.css` | Cores, tipografia, layout e adaptação a telas menores |
| `script.js` | Menu móvel, abas por tipo de conexão e configuração de lançamento |
| `config.js` | Link oficial do aplicativo e contato opcional |
| `assets/*.svg` | Ilustrações próprias, perfis demonstrativos e ícone |
| `nginx.conf` | Servidor estático, compressão e cabeçalhos de resposta |
| `Dockerfile` / `compose.yml` | Publicação opcional em container |

As cores principais estão nas variáveis de `:root` em `styles.css`.

## Comportamento e acessibilidade

- Layout para celular, tablet e computador.
- Conteúdo principal e perguntas frequentes disponíveis sem JavaScript.
- Menu móvel com estado anunciado, fechamento por Escape e retorno do foco ao botão.
- Abas navegáveis com setas, Home e End.
- Links de salto, foco visível e suporte a movimento reduzido.
- Imagens SVG locais com textos alternativos; perfis explicitamente ilustrativos.
- Fontes do sistema e nenhum recurso externo necessário para renderizar a página.
- Sem analytics, formulários ou cookies adicionados pelo site. A hospedagem pode manter registros técnicos de acesso.

As funções interativas e a aplicação dos campos de `config.js` dependem de JavaScript.
