#!/bin/bash

# ============================================
# SCRIPT DE PRUEBA COMPLETA - FRONTEND
# ============================================
# Genera evidencias de todos los endpoints
# Sin esperar a nadie, lo hacemos nosotros
# ============================================

echo "🚀 INICIANDO PRUEBAS DE ENDPOINTS..."
echo "======================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="https://api.al-eon.com"

# JWT Token (reemplazar con uno real de Supabase)
# Para obtenerlo: Login en la app → DevTools → Application → Local Storage → supabase.auth.token
JWT_TOKEN="${1:-}"

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ ERROR: Necesito un JWT token${NC}"
  echo ""
  echo "Uso: $0 <JWT_TOKEN>"
  echo ""
  echo "Para obtener el token:"
  echo "  1. Login en https://al-eon.netlify.app"
  echo "  2. DevTools → Application → Local Storage"
  echo "  3. Buscar: supabase.auth.token"
  echo "  4. Copiar el 'access_token'"
  echo ""
  exit 1
fi

echo "✅ Token recibido: ${JWT_TOKEN:0:20}..."
echo ""

# ============================================
# TEST 1: CHAT V2 (Non-streaming)
# ============================================
echo -e "${YELLOW}📝 TEST 1: Chat V2 (Normal)${NC}"
echo "Endpoint: POST $BASE_URL/api/ai/chat/v2"
echo ""

CHAT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE_URL/api/ai/chat/v2" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-$(date +%s)" \
  -d '{
    "message": "Hola, di solo OK",
    "sessionId": "test_session_'"$(date +%s)"'",
    "userId": "test_user"
  }')

HTTP_STATUS=$(echo "$CHAT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CHAT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ]; then
  echo -e "${GREEN}✅ Status: 200 OK${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
  echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY"
fi
echo ""
echo "------------------------------------"
echo ""

# ============================================
# TEST 2: CHAT STREAMING
# ============================================
echo -e "${YELLOW}📡 TEST 2: Chat Streaming (SSE)${NC}"
echo "Endpoint: POST $BASE_URL/api/ai/chat/stream"
echo ""

# SSE es más difícil con curl, solo probamos conectividad
STREAM_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE_URL/api/ai/chat/stream" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-request-id: test-stream-$(date +%s)" \
  -d '{
    "messages": [{"role":"user","content":"Di solo OK"}],
    "sessionId": "test_stream_'"$(date +%s)"'",
    "userId": "test_user"
  }' \
  --max-time 5)

HTTP_STATUS=$(echo "$STREAM_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$STREAM_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ]; then
  echo -e "${GREEN}✅ Status: 200 OK (SSE iniciado)${NC}"
  echo "Primeros bytes recibidos:"
  echo "$RESPONSE_BODY" | head -n 5
else
  echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY"
fi
echo ""
echo "------------------------------------"
echo ""

# ============================================
# TEST 3: VOICE STT
# ============================================
echo -e "${YELLOW}🎤 TEST 3: Voice STT${NC}"
echo "Endpoint: POST $BASE_URL/api/voice/stt"
echo ""

# Crear un audio dummy (1 segundo de silencio en WebM)
# En producción usarían un blob real grabado del navegador
echo "⚠️  Necesita audio real grabado desde navegador"
echo "   No podemos simular audio/webm desde bash"
echo -e "${YELLOW}⏭️  SKIPPING (requiere browser)${NC}"
echo ""
echo "Para probar manualmente:"
echo "  1. Abre DevTools → Network"
echo "  2. Click en micrófono en chat"
echo "  3. Habla: 'Prueba uno dos tres'"
echo "  4. Busca request POST /api/voice/stt"
echo "  5. Verifica Status: 200 + transcript"
echo ""
echo "------------------------------------"
echo ""

# ============================================
# TEST 4: MEETINGS START
# ============================================
echo -e "${YELLOW}🎙️  TEST 4: Meetings - Start${NC}"
echo "Endpoint: POST $BASE_URL/api/meetings/live/start"
echo ""

MEETING_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE_URL/api/meetings/live/start" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-meeting-$(date +%s)" \
  -d '{
    "title": "Test Meeting from Script",
    "description": "Automated test",
    "participants": [],
    "auto_send_enabled": false
  }')

HTTP_STATUS=$(echo "$MEETING_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$MEETING_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ]; then
  echo -e "${GREEN}✅ Status: 200 OK${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  
  # Intentar extraer meetingId para pruebas siguientes
  MEETING_ID=$(echo "$RESPONSE_BODY" | jq -r '.meetingId' 2>/dev/null)
  if [ "$MEETING_ID" != "null" ] && [ -n "$MEETING_ID" ]; then
    echo ""
    echo -e "${GREEN}📝 Meeting ID obtenido: $MEETING_ID${NC}"
  fi
else
  echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY"
fi
echo ""
echo "------------------------------------"
echo ""

# ============================================
# TEST 5: MEETINGS CHUNK (requiere meetingId)
# ============================================
echo -e "${YELLOW}📦 TEST 5: Meetings - Chunk${NC}"
echo "Endpoint: POST $BASE_URL/api/meetings/live/{id}/chunk"
echo ""

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ]; then
  echo "⚠️  Necesita audio WebM blob real"
  echo -e "${YELLOW}⏭️  SKIPPING (requiere browser + MediaRecorder)${NC}"
else
  echo -e "${YELLOW}⏭️  SKIPPING (no hay meetingId del test anterior)${NC}"
fi
echo ""
echo "------------------------------------"
echo ""

# ============================================
# TEST 6: MEETINGS STATUS
# ============================================
echo -e "${YELLOW}📊 TEST 6: Meetings - Status${NC}"
echo "Endpoint: GET $BASE_URL/api/meetings/live/{id}/status"
echo ""

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ]; then
  STATUS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$BASE_URL/api/meetings/live/$MEETING_ID/status" \
    -H "Authorization: Bearer $JWT_TOKEN")

  HTTP_STATUS=$(echo "$STATUS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$STATUS_RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Status: 200 OK${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  else
    echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY"
  fi
else
  echo -e "${YELLOW}⏭️  SKIPPING (no hay meetingId)${NC}"
fi
echo ""
echo "------------------------------------"
echo ""

# ============================================
# TEST 7: MEETINGS STOP
# ============================================
echo -e "${YELLOW}🛑 TEST 7: Meetings - Stop${NC}"
echo "Endpoint: POST $BASE_URL/api/meetings/live/{id}/stop"
echo ""

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ]; then
  STOP_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$BASE_URL/api/meetings/live/$MEETING_ID/stop" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "x-request-id: test-stop-$(date +%s)")

  HTTP_STATUS=$(echo "$STOP_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$STOP_RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Status: 200 OK${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  else
    echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY"
  fi
else
  echo -e "${YELLOW}⏭️  SKIPPING (no hay meetingId)${NC}"
fi
echo ""
echo "------------------------------------"
echo ""

# ============================================
# TEST 8: MEETINGS RESULT
# ============================================
echo -e "${YELLOW}📄 TEST 8: Meetings - Result${NC}"
echo "Endpoint: GET $BASE_URL/api/meetings/{id}/result"
echo ""

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ]; then
  RESULT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$BASE_URL/api/meetings/$MEETING_ID/result" \
    -H "Authorization: Bearer $JWT_TOKEN")

  HTTP_STATUS=$(echo "$RESULT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$RESULT_RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Status: 200 OK${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  else
    echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY"
  fi
else
  echo -e "${YELLOW}⏭️  SKIPPING (no hay meetingId)${NC}"
fi
echo ""
echo "------------------------------------"
echo ""

# ============================================
# RESUMEN
# ============================================
echo ""
echo "=========================================="
echo "✅ PRUEBAS COMPLETADAS"
echo "=========================================="
echo ""
echo "📋 Para evidencia completa con screenshots:"
echo "   1. Abre https://al-eon.netlify.app"
echo "   2. DevTools → Network tab"
echo "   3. Envía 1 mensaje de chat"
echo "   4. Graba 1 audio con micrófono"
echo "   5. Inicia 1 reunión de 20 segundos"
echo ""
echo "🔍 Busca en Network:"
echo "   - POST /api/ai/chat/v2 → 200"
echo "   - POST /api/voice/stt → 200"
echo "   - POST /api/meetings/live/start → 200"
echo ""
echo "📸 Captura screenshots y envía"
echo ""
