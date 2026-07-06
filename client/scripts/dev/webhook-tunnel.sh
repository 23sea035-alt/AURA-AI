#!/usr/bin/env bash
# webhook-tunnel — expose the local API server (:8080) for dashboard webhooks.
#
#   ./webhook-tunnel.sh                     ephemeral URL (changes each run)
#   ./webhook-tunnel.sh my-name.ngrok-free.app   your reserved static domain
#
# One-time setup: ngrok config add-authtoken <token>
#   (token: https://dashboard.ngrok.com/get-started/your-authtoken; claim a
#    free static domain at https://dashboard.ngrok.com/domains so the URL you
#    paste into the Clerk/RevenueCat dashboards survives restarts)
#
# Prints the exact endpoint URLs to paste into each dashboard:
#   Clerk      → https://<domain>/api/webhooks/clerk    (svix; CLERK_WEBHOOK_SECRET)
#   RevenueCat → https://<domain>/api/payments/webhook  (REVENUECAT_WEBHOOK_SECRET)
set -euo pipefail

PORT="${PORT:-8080}"
DOMAIN="${1:-}"

if ! ngrok config check >/dev/null 2>&1; then
  echo "ngrok has no authtoken yet. Run:"
  echo "  ngrok config add-authtoken <your-token>"
  echo "  (from https://dashboard.ngrok.com/get-started/your-authtoken)"
  exit 1
fi

if [[ -n "$DOMAIN" ]]; then
  ngrok http "$PORT" --url "$DOMAIN" --log stdout --log-format json >/tmp/aura-ngrok.log 2>&1 &
else
  ngrok http "$PORT" --log stdout --log-format json >/tmp/aura-ngrok.log 2>&1 &
fi
NGROK_PID=$!
trap 'kill $NGROK_PID 2>/dev/null || true' EXIT

# The local agent API reports the public URL once the tunnel is up.
for _ in $(seq 1 20); do
  sleep 0.5
  URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | python3 -c "import json,sys;ts=json.load(sys.stdin).get('tunnels',[]);print(ts[0]['public_url'] if ts else '')" 2>/dev/null || true)
  [[ -n "${URL:-}" ]] && break
done

if [[ -z "${URL:-}" ]]; then
  echo "tunnel failed to come up — tail /tmp/aura-ngrok.log"
  exit 1
fi

echo "tunnel up: $URL → http://localhost:$PORT"
echo
echo "Dashboard endpoints:"
echo "  Clerk      → $URL/api/webhooks/clerk"
echo "  RevenueCat → $URL/api/payments/webhook"
echo
echo "Ctrl-C stops the tunnel. (Server must be running: pnpm --dir server dev)"
wait $NGROK_PID
