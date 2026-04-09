# ⚽ AppFulbo — Coordiná el partido

Aplicación MVP para coordinar partidos de fútbol con amigos. Crea un evento, comparte el link, todos votan disponibilidad y el sistema elige el mejor horario. Integración con **ATC Sports / AlquilaTuCancha** para mostrar canchas disponibles.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Scraping | Playwright (fallback) |
| Cache | node-cache (in-memory) |

---

## Estructura del proyecto

```
AppFulbo/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Esquema de DB
│   ├── src/
│   │   ├── index.ts               # Entry point Express
│   │   ├── routes/
│   │   │   ├── events.ts          # CRUD de eventos
│   │   │   ├── availability.ts    # Guardar disponibilidad
│   │   │   └── fields.ts          # Canchas ATC Sports
│   │   ├── services/
│   │   │   ├── eventService.ts    # Lógica de negocio
│   │   │   └── atcService.ts      # Integración ATC Sports
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   └── validate.ts
│   │   └── lib/
│   │       ├── prisma.ts
│   │       ├── cache.ts
│   │       └── logger.ts
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Home / Crear evento
│   │   │   └── events/[id]/
│   │   │       └── page.tsx       # Vista del evento
│   │   ├── components/
│   │   │   ├── AvailabilityGrid.tsx   # Grilla drag-to-select
│   │   │   ├── ResultsPanel.tsx       # Resultados ordenados
│   │   │   ├── FieldsList.tsx         # Canchas disponibles
│   │   │   ├── JoinModal.tsx          # Modal para unirse
│   │   │   └── ShareButton.tsx        # Copiar link
│   │   └── lib/
│   │       ├── api.ts             # Cliente HTTP tipado
│   │       └── dates.ts           # Helpers de fechas
│   ├── .env.example
│   └── package.json
│
└── docker-compose.yml
```

---

## Setup local rápido

### Prerrequisitos

- Node.js 20+
- PostgreSQL 14+ (o Docker)
- npm

### 1. Clonar y configurar entorno

```bash
# Backend
cd backend
cp .env.example .env
# Editar .env con tu DATABASE_URL y opcionales de ATC

# Frontend
cd ../frontend
cp .env.example .env.local
```

### 2. Base de datos

**Opción A — Docker (recomendado):**
```bash
# Desde la raíz del proyecto
docker-compose up postgres -d
```

**Opción B — PostgreSQL local:**
```bash
createdb appfulbo
```

### 3. Instalar dependencias y migrar

```bash
# Backend
cd backend
npm install
npm run prisma:push        # Crea las tablas
npm run prisma:generate    # Genera el cliente Prisma

# Frontend
cd ../frontend
npm install
```

### 4. Correr el proyecto

```bash
# Terminal 1 — Backend (puerto 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (puerto 3000)
cd frontend
npm run dev
```

Abrir: http://localhost:3000

---

## Con Docker Compose (todo junto)

```bash
docker-compose up --build
```

Servicios:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/events` | Crear evento |
| `GET` | `/events/:id` | Obtener evento con participantes |
| `POST` | `/events/:id/join` | Unirse como participante |
| `POST` | `/availability` | Guardar disponibilidad |
| `GET` | `/events/:id/results` | Resultados ordenados por votos |
| `GET` | `/fields?date=YYYY-MM-DD&time=HH:mm` | Canchas disponibles |
| `GET` | `/health` | Health check |

### Ejemplos

```bash
# Crear evento
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Fútbol del viernes","startDate":"2026-04-10","endDate":"2026-04-16"}'

# Unirse
curl -X POST http://localhost:3001/events/:id/join \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan"}'

# Guardar disponibilidad
curl -X POST http://localhost:3001/availability \
  -H "Content-Type: application/json" \
  -d '{"participantId":"...","eventId":"...","slots":[{"date":"2026-04-11","timeSlot":"20:00"}]}'

# Canchas
curl "http://localhost:3001/fields?date=2026-04-11&time=20:00"
```

---

## Integración ATC Sports

### Setup de autenticación (una sola vez)

ATC Sports usa Firebase Auth. El backend necesita un token válido para consultar canchas.

**Opción A — Login interactivo (recomendado para primera vez):**
```bash
# Con el backend corriendo:
curl -X POST http://localhost:3001/auth/atc/login
# Se abre una ventana del browser → loguéate en atcsports.io
# El backend captura y guarda el token automáticamente en .atc-session.json
# Los tokens se renuevan solos — solo necesitás hacer esto una vez
```

**Opción B — Token manual:**
1. Abrí https://atcsports.io en Chrome
2. Loguéate con tu cuenta
3. DevTools → Network → filtrá por `/api/v3/`
4. Abrí cualquier request → Header → copiá `Authorization: Bearer <TOKEN>`
5. Pegalo en `backend/.env` como `ATC_API_KEY=<TOKEN>`

**Verificar estado:**
```bash
curl http://localhost:3001/auth/atc/status
# {"authenticated": true, "tokenPreview": "eyJhbGciOiJSUzI1..."}
```

### ¿Cómo funciona?

ATC Sports usa Firebase Auth (proyecto: `alquilatucancha-3f36d`). El token se renueva automáticamente.

```
1. Token válido disponible (.atc-session.json o ATC_API_KEY)
   → GET /api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=DATE
   → GET /api/v3/slot/search?placeId=ID&date=DATE&sport_id=1
   → Retorna venues reales con disponibilidad de slots

2. Sin token — Playwright scraper
   → Navega a atcsports.io/buscar con coordenadas de CABA
   → Intercepta las llamadas API y captura el token automáticamente

3. Datos mock de CABA (fallback final)
   → Lista de canchas de Buenos Aires de ejemplo

Token management automático:
- Se guarda en .atc-session.json (gitignored)
- Se renueva sin intervención usando Firebase refreshToken
- Solo necesitás loguearte UNA sola vez
```

### Variables de entorno ATC

```env
ATC_BASE_URL="https://atcsports.io"
ATC_API_KEY=""              # Override manual (opcional si ya hiciste el login interactivo)
ATC_SEARCH_LAT="-34.6037"  # CABA centro (no cambiar)
ATC_SEARCH_LNG="-58.3816"
ATC_SPORT_ID="1"           # 1=fútbol, 2=pádel, 3=tenis
CACHE_TTL_SECONDS="300"
```

---

## Modelos de datos

```sql
Event: id, name, startDate, endDate
Participant: id, name, eventId
Availability: id, participantId, eventId, date, timeSlot
VenueCache: id, name, location, address, cachedAt
```

---

## Features implementadas

- [x] Crear evento con rango de fechas
- [x] Link compartible sin auth
- [x] Unirse al evento con nombre
- [x] Grilla de disponibilidad drag-to-select
- [x] Mapa de calor de votos en la grilla
- [x] Resultados ordenados por popularidad
- [x] Integración ATC Sports (3 estrategias: API → Scraping → Mock)
- [x] Cache de respuestas (evita golpear ATC en exceso)
- [x] Estado persistido en localStorage (recuerda quién sos)
- [x] Polling automático cada 30s de resultados
- [x] Diseño oscuro, mobile-friendly

---

## Desarrollo

```bash
# Ver logs de Prisma
npm run prisma:studio

# Resetear DB
npx prisma migrate reset --schema=./prisma/schema.prisma

# Build producción backend
npm run build && npm start
```
# FulboApp
