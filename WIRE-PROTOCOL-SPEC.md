# 📡 WIRE PROTOCOL SPECIFICATION - AL-E CORE

## Contrato Frontend ↔ Backend

### 1. POST `/api/files/ingest` (multipart)

**Request:**
```
Content-Type: multipart/form-data

workspaceId: string
userId: string
files[]: File[]
```

**Response:**
```json
{
  "fileIds": ["uuid-1", "uuid-2"],
  "status": "processing"
}
```

---

### 2. POST `/api/ai/chat`

#### Opción A: JSON (sin archivos)
```json
{
  "workspaceId": "al-eon",
  "userId": "user-uuid",
  "mode": "universal",
  "messages": [
    { "role": "user", "content": "texto" }
  ],
  "context": {
    "fileIds": ["uuid-1", "uuid-2"]
  }
}
```

#### Opción B: Multipart (con archivos)
```
Content-Type: multipart/form-data

workspaceId: string
userId: string
mode: string
messages: string (JSON stringified)
files[]: File[]
context: string (JSON stringified, opcional)
```

---

## Estados Frontend

- `idle` - Sin archivos
- `uploading` - Subiendo a storage/ingesta
- `processing` - Backend extrayendo texto/chunks
- `ready` - Archivos listos para chat
- `error` - Falló upload o procesamiento

---

## Tipos Soportados

Mínimo obligatorio:
- `.pdf`
- `.docx`
- `.txt`
- `.md`
- `.csv`
- `.json`

Backend decide si acepta otros tipos.
