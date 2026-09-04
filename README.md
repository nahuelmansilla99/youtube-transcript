# 🎬 YouTube Transcript API

Microservicio construido con **NestJS** y **TypeScript** para extraer la transcripción (subtítulos) de cualquier video de YouTube enviando la URL y el idioma deseado.

---

## 🚀 Características

- **Extracción Automática**: Obtiene el texto plano de los subtítulos de un video de YouTube.
- **Estrategia Inteligente de Fallback**: Si pides subtítulos en español (`es`) y el video no los tiene en esa variante exacta, la API busca automáticamente variantes dialectales (ej. `es-419`, `es-ES`) o el idioma predeterminado del video (ej. `en`) en lugar de fallar.
- **Validación Automática DTO**: Filtra y valida las URLs de entrada mediante `class-validator`.
- **Documentación Interactiva Swagger UI**: Consola Swagger integrada para probar manualmente la API desde el navegador.
- **Dockerizado**: Construcción Multi-Stage ligera con Node.js Alpine.
- **Compatible con Dokploy / VPS**: Listo para desplegar en 1-clic usando Dokploy o Docker Compose.

---

## 🛠️ Tecnologías

- **Framework**: [NestJS](https://nestjs.org/) (v11)
- **Lenguaje**: TypeScript
- **Librería de transcripción**: `youtube-transcript`
- **Documentación OpenAPI**: `@nestjs/swagger` + `swagger-ui-express`
- **Validación**: `class-validator` + `class-transformer`
- **Contenedores**: Docker (Multi-stage build)

---

## 📖 Documentación de la API (Endpoints)

### 📌 `POST /youtube/extract`

Extrae el texto completo de los subtítulos de un video de YouTube.

#### **Cuerpo de la Petición (Request Body - JSON)**

| Campo | Tipo | Requerido | Por Defecto | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Sí** | - | URL completa del video de YouTube | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| `lang` | `string` | No | `es` | Código ISO de idioma | `es` o `en` |
| `fallback` | `boolean` | No | `true` | Si es `true`, busca variantes dialectales (ej. `es-419`) o el idioma original del video si el idioma especificado no existe | `true` |

##### Ejemplo de Body:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "lang": "es",
  "fallback": true
}
```

---

#### **Respuestas HTTP**

##### **200 OK (Éxito)**
```json
{
  "success": true,
  "transcript": "Texto completo del video concatenado en una sola cadena de texto...",
  "langUsed": "es-419",
  "fallbackApplied": true
}
```

##### **400 Bad Request (URL inválida o no requerida)**
```json
{
  "message": [
    "La URL proporcionada no es una URL válida"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

##### **400 Bad Request (Sin subtítulos disponibles)**
```json
{
  "statusCode": 400,
  "message": "No se pudo extraer la transcripción. El video no contiene subtítulos en el idioma 'es' ni subtítulos alternativos disponibles.",
  "error": "Bad Request"
}
```

---

### 🧪 Ejemplos de uso con `cURL`

#### Extraer subtítulos en Español (con fallback habilitado):
```bash
curl -X POST http://localhost:3000/youtube/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "lang": "es",
    "fallback": true
  }'
```

#### Requerir estrictamente subtítulos en Español (sin fallback):
```bash
curl -X POST http://localhost:3000/youtube/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "lang": "es",
    "fallback": false
  }'
```

---

## 📑 Consola Swagger UI (Pruebas Interactivas a Mano)

La aplicación incluye una interfaz interactiva de Swagger para probar los endpoints directamente desde el navegador:

👉 **URL de Swagger UI**: `http://localhost:3000/api` (o `https://tu-dominio.com/api` en tu VPS)

---

## 💻 Desarrollo Local

### 1. Clonar e instalar dependencias
```bash
npm install
```

### 2. Iniciar en modo desarrollo
```bash
npm run start:dev
```

### 3. Ejecutar pruebas unitarias y e2e
```bash
# Pruebas unitarias
npm run test

# Pruebas End-to-End
npm run test:e2e
```

---

## 🐳 Ejecución con Docker Local

### Con Docker Compose:
```bash
# Construir y levantar contenedor
docker compose up -d

# Ver logs
docker compose logs -f

# Detener contenedor
docker compose down
```

---

## 🌐 Despliegue en VPS usando **Dokploy**

Este repositorio está 100% optimizado para desplegarse mediante **Dokploy** en tu VPS:

1. **Crear nueva aplicación en Dokploy**:
   - Tipo de proyecto: **Application**.
   - Provider: **GitHub / GitLab** (conecta este repositorio).
2. **Configuración de Build**:
   - Build Type: **Dockerfile** (Dokploy detectará automáticamente el `Dockerfile` del proyecto).
3. **Variables de Entorno**:
   - `PORT=3000`
   - `NODE_ENV=production`
4. **Puerto y Dominio**:
   - Configura el puerto del contenedor a `3000`.
   - Asigna tu dominio o subdominio en Dokploy (ejemplo: `transcript-api.tudominio.com`).
5. **Desplegar**:
   - Haz clic en **Deploy**. Dokploy compilará el contenedor Alpine y lo levantará.
   - Accede a `https://transcript-api.tudominio.com/api` para acceder a la documentación interactiva de Swagger en producción.
