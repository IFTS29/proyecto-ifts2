# ADR-001: Arquitectura Serverless desacoplada en Vercel

* **Estado:** Aceptado  
* **Fecha:** 2026-10-10  
* **Decisores:** Equipo 404-Solutions (Desarrollo y Arquitectura)  
* **Relacionado con:** Issue `#42`, `#49 [DONE-01]`, `#28 [SETUP-01]`

---

## 1. Contexto y Planteo del Problema

El IFTS N.° 2 requiere un portal web institucional moderno que reemplace su antiguo sitio en Google Sites, acompañado de un panel de administración para el personal del instituto. Como requisito primordial de la cátedra y del cliente, el sistema debe operar bajo un **costo de infraestructura cero** (sin costos fijos mensuales recurrentes para la institución pública).

Se evaluaron dos enfoques principales de despliegue:
1. **Servidor VPS dedicado tradicional (ej. DigitalOcean, AWS EC2, Render pago):** ejecuta Node.js de forma continua las 24 horas del día.
2. **Plataforma Serverless / Edge (Vercel con base de datos en nube externa):** el frontend compila como sitio estático distribuido en una CDN global, y las rutas de backend `/api` se ejecutan como funciones serverless bajo demanda.

---

## 2. Decisión Adoptada

Se decidió implementar una **arquitectura Serverless desacoplada en Vercel**:
* El frontend (React 18 + Vite) se compila en assets estáticos bajo `client/dist`, distribuidos a través del Edge Network de Vercel con tiempos de carga casi instantáneos.
* La API de backend (Node.js + Express) se expone a través de una función serverless única en `api/index.js`, que procesa todas las peticiones con prefijo `/api/*`.
* Para el desarrollo local unificado, se creó un script en la raíz (`server.js`) que integra Express y monta Vite en modo middleware sobre un único puerto (`PORT`, por defecto `3000`).

---

## 3. Consecuencias y Trade-offs

### Consecuencias Positivas
* **Costo operativo nulo:** no requiere contratación ni mantenimiento de servidores dedicados; aprovecha el plan gratuito (*Hobby Tier*) de Vercel.
* **Escalabilidad y distribución:** el sitio público responde desde la CDN con latencia mínima para alumnos y aspirantes.
* **Despliegues inmutables y reversiones instantáneas:** cada commit genera un entorno de vista previa (*preview deployment*) y un despliegue de producción inmutable con capacidad de *Instant Rollback*.

### Consecuencias Negativas / Compromisos Asumidos
* **Contenedores efímeros y disco de sólo lectura:** en Vercel el sistema de archivos (`/var/task`) no permite persistir archivos locales permanentemente, lo que obligó a delegar el almacenamiento de imágenes a un servicio externo (ver `ADR-005`) y la generación de PDFs en memoria (ver `ADR-003`).
* **Arranque en frío (*Cold Starts*):** la primera petición a la API tras un período de inactividad puede experimentar una latencia inicial de 1 a 2 segundos mientras la función serverless inicializa la conexión con MongoDB Atlas.
