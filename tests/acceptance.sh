#!/usr/bin/env bash
# ===========================================================================
# Glamorapp — Pruebas de Aceptación Multi-Sucursal
# Idempotente: limpia stores viejas antes de crear nuevas.
# ===========================================================================
set -euo pipefail

API="http://localhost:3001/api/v1"
PASS=0
FAIL=0
TS=$(date +%s)

green() { echo -e "\033[32m✓ $1\033[0m"; PASS=$((PASS+1)); }
red()   { echo -e "\033[31m✗ $1\033[0m"; FAIL=$((FAIL+1)); }

assert() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then green "$desc"
  else red "$desc → esperado='$expected' obtenido='$actual'"; fi
}
assert_contains() {
  local desc="$1" pattern="$2" actual="$3"
  if echo "$actual" | grep -q "$pattern"; then green "$desc"
  else red "$desc → no contiene '$pattern' en: $actual"; fi
}
assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" -eq "$expected" ]]; then green "$desc"
  else red "$desc → esperado HTTP $expected, obtenido HTTP $actual"; fi
}

echo "============================================"
echo "  Glamorapp — Pruebas de Aceptación"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ═══════════════════════ 1. AUTH ═══════════════════════

echo "--- 1. Autenticación ---"

LOGIN=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@glamorapp.com","password":"admin123"}')
TOKEN_ADMIN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))")
REDIRECT=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectPath',''))")
STORES=$(echo "$LOGIN" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('stores',[])))")
USER_ROLE=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('role',''))")

assert_status "Login tenant_admin HTTP 200" 200 "$(echo "$LOGIN" | python3 -c "import sys,json; r=json.load(sys.stdin); print(200 if r.get('accessToken') else 401)")"
assert "Login redirectPath = /tenant" "/tenant" "$REDIRECT"
assert "Login role = tenant_admin" "tenant_admin" "$USER_ROLE"
assert "Login tiene stores >= 1" "OK" "$([[ $STORES -ge 1 ]] && echo "OK" || echo "FAIL")"

LOGIN2=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"email":"superadmin@glamorapp.com","password":"superadmin123"}')
TOKEN_SUPER=$(echo "$LOGIN2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))")
REDIRECT2=$(echo "$LOGIN2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectPath',''))")

assert "Superadmin redirectPath = /admin" "/admin" "$REDIRECT2"
assert "Superadmin login OK" "OK" "$([[ -n $TOKEN_SUPER ]] && echo "OK" || echo "FAIL")"

ME=$(curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN_ADMIN")
HAS_SCOPES=$(echo "$ME" | python3 -c "import sys,json; print('sí' if json.load(sys.stdin).get('scopes') else 'no')")
HAS_PLAN=$(echo "$ME" | python3 -c "import sys,json; print('sí' if json.load(sys.stdin).get('plan') else 'no')")
assert "GET /auth/me incluye scopes" "sí" "$HAS_SCOPES"
assert "GET /auth/me incluye plan" "sí" "$HAS_PLAN"

FP=$(curl -s -X POST "$API/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"admin@glamorapp.com"}')
FP_SUCCESS=$(echo "$FP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',''))")
assert "Forgot password retorna success" "True" "$FP_SUCCESS"

echo ""

# ═══════════════════════ 2. TENANT PANEL ═══════════════════════

echo "--- 2. Panel Tenant (/tenant) ---"

DASH=$(curl -s "$API/tenant/dashboard" -H "Authorization: Bearer $TOKEN_ADMIN")
DASH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/tenant/dashboard" -H "Authorization: Bearer $TOKEN_ADMIN")
assert_status "GET /tenant/dashboard HTTP 200" 200 "$DASH_CODE"
assert_contains "Dashboard tiene totalStores" "totalStores" "$DASH"

STORES_LIST=$(curl -s "$API/tenant/stores" -H "Authorization: Bearer $TOKEN_ADMIN")
STORE_COUNT=$(echo "$STORES_LIST" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
assert "List stores >= 1" "OK" "$([[ $STORE_COUNT -ge 1 ]] && echo "OK" || echo "FAIL")"

# --- Limpiar stores viejas de pruebas anteriores ---
echo "   Limpiando stores de prueba anteriores..."
CLEANED=0
echo "$STORES_LIST" | python3 -c "
import sys, json
stores = json.load(sys.stdin)
for s in stores:
    slug = s.get('slug','')
    if slug.startswith('test-') or slug == 'norte':
        print(s['id'])
" | while read -r OLD_ID; do
  if [ -n "$OLD_ID" ]; then
    curl -s -X PUT "$API/tenant/stores/$OLD_ID/toggle" \
      -H "Authorization: Bearer $TOKEN_ADMIN" \
      -H "Content-Type: application/json" \
      -d '{"isActive":false}' > /dev/null 2>&1 || true
    echo "     ✓ Desactivada store $OLD_ID"
  fi
done

# --- Crear nueva store ---
STORE_SLUG="test-${TS}"
STORE=$(curl -s -X POST "$API/tenant/stores" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Sucursal Test\",\"slug\":\"${STORE_SLUG}\",\"email\":\"test${TS}@test.com\",\"phone\":\"+57301${TS: -6}\",\"city\":\"Bogotá\"}")
STORE_ID=$(echo "$STORE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
assert "Crear sucursal retorna ID" "OK" "$([[ -n $STORE_ID ]] && echo "OK" || echo "FAIL")"

# --- Crear usuario en la store ---
USER_EMAIL="cajero${TS}@test.com"
USER_CREATED=$(curl -s -X POST "$API/tenant/users" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"test123\",\"firstName\":\"Pedro\",\"lastName\":\"Perez\",\"role\":\"cashier\",\"storeId\":\"${STORE_ID}\"}")
USER_ID=$(echo "$USER_CREATED" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
assert "Crear usuario retorna ID" "OK" "$([[ -n $USER_ID ]] && echo "OK" || echo "FAIL")"

# --- Reset password ---
RESET=$(curl -s -X POST "$API/tenant/users/$USER_ID/reset-password" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"password":"nuevapass123"}')
RESET_OK=$(echo "$RESET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))")
assert "Reset password retorna email" "${USER_EMAIL}" "$RESET_OK"

USERS=$(curl -s "$API/tenant/users" -H "Authorization: Bearer $TOKEN_ADMIN")
USERS_COUNT=$(echo "$USERS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
assert "List users >= 3" "OK" "$([[ $USERS_COUNT -ge 3 ]] && echo "OK" || echo "FAIL")"

echo ""

# ═══════════════════════ 3. STORE ISOLATION ═══════════════════════

echo "--- 3. Store Isolation ---"

CASHIER_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"nuevapass123\"}")
TOKEN_CASHIER=$(echo "$CASHIER_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))")
CASHIER_STORE=$(echo "$CASHIER_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('storeId',''))")
CASHIER_ROLE=$(echo "$CASHIER_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('role',''))")
CASHIER_REDIRECT=$(echo "$CASHIER_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('redirectPath',''))")

assert "Cashier login OK" "OK" "$([[ -n $TOKEN_CASHIER ]] && echo "OK" || echo "FAIL")"
assert "Cashier role = cashier" "cashier" "$CASHIER_ROLE"
assert "Cashier redirectPath = /dashboard" "/dashboard" "$CASHIER_REDIRECT"
assert "Cashier tiene storeId" "OK" "$([[ -n $CASHIER_STORE ]] && echo "OK" || echo "FAIL")"

echo ""

# ═══════════════════════ 4. ROLE SCOPES ═══════════════════════

echo "--- 4. Role Scopes ---"

TENANT_ACCESS=$(curl -s -o /dev/null -w "%{http_code}" "$API/tenant/dashboard" -H "Authorization: Bearer $TOKEN_ADMIN")
assert_status "tenant_admin accede a /tenant/dashboard" 200 "$TENANT_ACCESS"

CASHIER_TENANT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/tenant/dashboard" -H "Authorization: Bearer $TOKEN_CASHIER")
assert_status "Cashier NO accede a /tenant" 403 "$CASHIER_TENANT_CODE"

SUPER_AI=$(curl -s -o /dev/null -w "%{http_code}" "$API/admin/ai-usage" -H "Authorization: Bearer $TOKEN_SUPER")
assert_status "Superadmin accede a /admin/ai-usage" 200 "$SUPER_AI"

TENANT_ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/admin/ai-usage" -H "Authorization: Bearer $TOKEN_ADMIN")
assert_status "tenant_admin NO accede a /admin" 403 "$TENANT_ADMIN_CODE"

echo ""

# ═══════════════════════ 5. WHATSAPP ═══════════════════════

echo "--- 5. WhatsApp por Sucursal ---"

WA_CONFIG=$(curl -s -X PUT "$API/whatsapp/bridge/session/config" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"whatsappNumber":"+573011234567"}')
WA_NUMBER=$(echo "$WA_CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('whatsappNumber',''))")
assert "Configurar WhatsApp en sucursal" "+573011234567" "$WA_NUMBER"

echo ""

# ═══════════════════════ 6. PLANES ═══════════════════════

echo "--- 6. Planes ---"

PLANS=$(curl -s "$API/admin/plans" -H "Authorization: Bearer $TOKEN_SUPER")
PLANS_COUNT=$(echo "$PLANS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
assert "Planes count >= 3" "OK" "$([[ $PLANS_COUNT -ge 3 ]] && echo "OK" || echo "FAIL")"

FIRST_PLAN_FEATURES=$(echo "$PLANS" | python3 -c "
import sys,json
d=json.load(sys.stdin)[0]
print('True' if 'modules' in (d.get('features') or {}) else 'False')
")
assert "Plan features tiene modules" "True" "$FIRST_PLAN_FEATURES"

echo ""

# ═══════════════════════ 7. AI USAGE ═══════════════════════

echo "--- 7. AI Usage ---"

AI_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/admin/ai-usage" -H "Authorization: Bearer $TOKEN_SUPER")
assert_status "GET /admin/ai-usage HTTP 200" 200 "$AI_CODE"

TENANT_AI_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/tenant/ai-usage" -H "Authorization: Bearer $TOKEN_ADMIN")
assert_status "GET /tenant/ai-usage HTTP 200" 200 "$TENANT_AI_CODE"

echo ""

# ═══════════════════════ RESULTADO ═══════════════════════

echo "============================================"
echo "  RESULTADO: $PASS pasaron, $FAIL fallaron"
echo "============================================"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "⚠️  Hay pruebas que fallaron. Revisar arriba."
  exit 1
else
  echo ""
  echo "✅ Todas las pruebas pasaron."
  exit 0
fi
