#!/usr/bin/env bash
# Script para iniciar o Brave com porta de depuração ativa para o agente de IA

echo "Encerrando instâncias antigas do Brave..."
killall -9 brave-browser-stable brave 2>/dev/null
sleep 1

mkdir -p "$HOME/.config/google-chrome"

echo "Iniciando Brave com depuração na porta 9222..."
brave-browser --remote-debugging-port=9222 --user-data-dir="$HOME/.config/google-chrome" --no-first-run --no-default-browser-check "https://bytime.me/" >/dev/null 2>&1 &

echo "Aguardando inicialização do navegador..."
sleep 2

# Obter o GUID real do DevTools para o DevToolsActivePort
python3 -c "
import urllib.request, json, time

for i in range(10):
    try:
        data = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json/version', timeout=1).read().decode())
        ws_url = data.get('webSocketDebuggerUrl', '')
        if ws_url:
            path = ws_url.split(':9222/')[1]
            with open('$HOME/.config/google-chrome/DevToolsActivePort', 'w') as f:
                f.write(f'9222\n{path}\n')
            print('✅ DevToolsActivePort configurado com GUID:', path)
            break
    except Exception:
        time.sleep(0.5)
else:
    print('⚠️ Não foi possível obter o GUID via http://127.0.0.1:9222/json/version')
"

echo "========================================================="
echo "✅ Tudo pronto! Pode voltar ao chat e avisar a IA."
echo "========================================================="
