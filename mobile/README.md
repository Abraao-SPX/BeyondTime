# BeyondTime Mobile

Projeto base em React Native com Expo SDK 54 e suporte a atualizações remotas automáticas (EAS Update).

## Como Executar

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npx expo start
```

## Publicação de Atualizações Remotas (OTA)

```bash
# Publica atualização instantânea sem precisar recompilar o APK
npx eas-cli update --channel preview --message "Nova funcionalidade"
```
