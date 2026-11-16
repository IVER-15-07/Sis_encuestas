# Despliegue con Docker

## Requisitos

- Docker Desktop iniciado.
- Una base de datos PostgreSQL accesible desde el contenedor backend.

## Configuracion

Copia `.env.example` como `.env` y completa las variables reales de PostgreSQL. No subas `.env` al repositorio.

## Iniciar la aplicacion

Desde la raíz del proyecto:

```powershell
Copy-Item .env.example .env
# Edita .env con tus credenciales reales

docker compose up --build -d
```

La aplicacion quedara disponible en `http://localhost:8080`. Nginx sirve el frontend y redirige las peticiones `/api` al backend Spring Boot.

## Ver logs y detener

```powershell
docker compose logs -f backend

docker compose down
```

El backend escucha internamente en el puerto `8282`; solo el frontend publica el puerto `8080`.

## Vercel + Render

Para produccion puedes desplegar cada parte por separado:

### Backend en Render

1. Crea un `Web Service` conectado al repositorio.
2. Usa `mi-backend` como `Root Directory`.
3. Selecciona `Docker` como entorno.
4. Agrega estas variables:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://host:5432/database?sslmode=require
SPRING_DATASOURCE_USERNAME=usuario
SPRING_DATASOURCE_PASSWORD=password
```

Render asigna automaticamente `PORT`; Spring Boot ya esta configurado para usarlo.

### Frontend en Vercel

1. Importa el mismo repositorio.
2. Usa `Sis_encuestas` como `Root Directory`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Agrega la variable de entorno:

```text
VITE_API_URL=https://TU-BACKEND.onrender.com
```

El archivo `vercel.json` mantiene funcionando las rutas de React Router al refrescar la pagina.
