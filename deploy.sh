#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> [1/5] Executando testes do backend..."
PYTHONPATH="$ROOT_DIR" "$ROOT_DIR/backend/.venv/bin/pytest" "$ROOT_DIR/backend/tests/" -v

echo "==> [2/5] Compilando frontend (Vite build)..."
cd "$ROOT_DIR/frontend"
if [ ! -d node_modules ]; then
  npm ci
fi
npm run build
cd "$ROOT_DIR"

echo "==> [3/5] Verificando Caddyfile..."
if [ -f "$ROOT_DIR/Caddyfile" ] && ! cmp -s "$ROOT_DIR/Caddyfile" /etc/caddy/Caddyfile; then
  sudo -n cp "$ROOT_DIR/Caddyfile" /etc/caddy/Caddyfile
  sudo -n chmod 644 /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile
  sudo -n systemctl reload caddy
  echo "Caddyfile atualizado e Caddy recarregado."
else
  echo "Caddyfile sem alterações."
fi

echo "==> [4/5] Reiniciando backend (new-career-backend)..."
sudo -n systemctl restart new-career-backend

echo "==> [5/5] Verificando saúde da aplicação..."
for i in $(seq 1 10); do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS http://127.0.0.1:8000/api/health && echo ""
ROOT_CODE="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 https://career.andydias.pt/ || echo "000")"
API_CODE="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 https://career.andydias.pt/api/health || echo "000")"
echo "https://career.andydias.pt/ -> HTTP $ROOT_CODE"
echo "https://career.andydias.pt/api/health -> HTTP $API_CODE"

if [ "$ROOT_CODE" != "200" ] || [ "$API_CODE" != "200" ]; then
  echo "ERRO: verificação HTTPS falhou (ROOT=$ROOT_CODE, API=$API_CODE)" >&2
  exit 1
fi

echo "==> Deploy concluído com sucesso!"
