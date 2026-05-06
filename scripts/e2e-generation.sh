#!/usr/bin/env bash
# Day 6 — production end-to-end generation smoke test.
#
# What it does:
#   1. Authenticates against api.rekaman.io as the founder account.
#   2. Creates a one-shot test product (slug includes a timestamp so the
#      script is rerunnable without slug collisions).
#   3. Triggers generation with a public photo URL.
#   4. Polls /generation-status every 5 s until READY or FAILED (max 6 min).
#   5. Prints the resulting glbUrl on success.
#
# Cost: a real Meshy charge (~10–20 credits, ~₹40–₹80 / ~$0.50–$1).
# Cleanup: leaves the test product in prod DB; sweep via the periodic
# `KEEP_PATTERNS` cleanup script (see CLAUDE.md → Production Data Hygiene)
# or delete manually after verifying.
#
# Required env (export before running):
#   FOUNDER_PASSWORD   — your founder@rekaman.io login password
#   PHOTO_URL          — public HTTPS URL of a real product photo
#                        (single object, clean background, ≥512px)
# Optional:
#   API_BASE           — defaults to https://api.rekaman.io
#   FOUNDER_EMAIL      — defaults to founder@rekaman.io

set -euo pipefail

API_BASE="${API_BASE:-https://api.rekaman.io}"
FOUNDER_EMAIL="${FOUNDER_EMAIL:-founder@rekaman.io}"
: "${FOUNDER_PASSWORD:?FOUNDER_PASSWORD must be exported}"
: "${PHOTO_URL:?PHOTO_URL must be exported}"

require() {
  command -v "$1" >/dev/null 2>&1 || { echo >&2 "missing required tool: $1"; exit 1; }
}
require curl
require jq

ts="$(date +%s)"
slug="e2e-test-$ts"

echo "─── 1/4 login ───"
TOKEN=$(curl -fsS -X POST "$API_BASE/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$FOUNDER_EMAIL\",\"password\":\"$FOUNDER_PASSWORD\"}" \
  | jq -r '.token')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] || { echo 'login failed'; exit 1; }
echo "logged in as $FOUNDER_EMAIL"

echo "─── 2/4 create test product (slug=$slug) ───"
PRODUCT_ID=$(curl -fsS -X POST "$API_BASE/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"E2E Test $ts\",\"slug\":\"$slug\"}" \
  | jq -r '.product.id')
echo "product id = $PRODUCT_ID"

echo "─── 3/4 trigger generation ───"
GEN_RESPONSE=$(curl -fsS -X POST "$API_BASE/v1/products/$PRODUCT_ID/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"photoUrls\":[\"$PHOTO_URL\"]}")
MESHY_TASK_ID=$(echo "$GEN_RESPONSE" | jq -r '.meshyTaskId')
JOB_ID=$(echo "$GEN_RESPONSE" | jq -r '.jobId')
echo "meshyTaskId = $MESHY_TASK_ID"
echo "jobId       = $JOB_ID"

echo "─── 4/4 poll until READY / FAILED (max 6 min) ───"
DEADLINE=$(( $(date +%s) + 360 ))
while true; do
  if [ "$(date +%s)" -gt "$DEADLINE" ]; then
    echo 'POLL TIMEOUT (6 min)'
    exit 2
  fi
  sleep 5
  STATUS_BODY=$(curl -fsS -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/v1/products/$PRODUCT_ID/generation-status")
  STATUS=$(echo "$STATUS_BODY" | jq -r '.status')
  echo "  [$(date +%T)] status=$STATUS"
  case "$STATUS" in
    READY)
      GLB_URL=$(echo "$STATUS_BODY" | jq -r '.glbUrl')
      GLB_KB=$(echo "$STATUS_BODY" | jq -r '.glbSizeKb')
      echo
      echo "✅ generation complete"
      echo "   glbUrl  = $GLB_URL"
      echo "   sizeKb  = $GLB_KB"
      echo
      echo "Visual verification: open $GLB_URL in https://gltf-viewer.donmccurdy.com/"
      exit 0
      ;;
    FAILED)
      echo
      echo "❌ generation failed"
      echo "$STATUS_BODY" | jq '.generation'
      exit 3
      ;;
  esac
done
