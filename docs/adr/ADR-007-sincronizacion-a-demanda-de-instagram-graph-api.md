# ADR-007: Sincronización a demanda de Instagram Graph API con fallback manual

* **Estado:** Aceptado  
* **Fecha:** 2026-10-27  
* **Decisores:** Equipo 404-Solutions (Backend, QA y UX)  
* **Relacionado con:** Issue `#42`, `#39 [US-10]`, `#55 [SPIKE-01]`, `#64 [QA-03]`, `#122`

---

## 1. Contexto y Planteo del Problema

El instituto utiliza activamente su cuenta de Instagram para difundir actividades y muestras de los alumnos. El objetivo era reflejar automáticamente esas publicaciones en la web sin duplicar el trabajo editorial.

Sin embargo, la integración con Meta Graph API presenta restricciones técnicas y operativas severas:
1. **Vencimiento de tokens:** los tokens de larga duración de Meta expiran a los 60 días.
2. **Entorno Serverless en Vercel:** una función serverless no puede sobreescribir sus variables de entorno estáticas (`process.env.INSTAGRAM_TOKEN`) para persistir renovaciones automáticas en caliente.
3. **Riesgo de cuota o caídas de red:** si Meta bloquea peticiones, cambia la API o vence el token, el portal público no puede quedar roto ni mostrar tarjetas vacías con enlaces caídos.

---

## 2. Decisión Adoptada

Se decidió implementar un esquema de **Sincronización a demanda con manejo de fallos y carga manual alternativa**:
* **Ejecución a demanda:** la sincronización no utiliza crons automáticos en segundo plano para el MVP; se dispara explícitamente desde el panel administrativo (`POST /api/instagram/sync`) mediante un botón de control en la sección de Eventos.
* **Clasificación por Hashtag:** el servicio (`server/src/services/instagram/parser.js`) analiza las últimas 20 publicaciones de la cuenta y solo importa aquellas que contengan `#eventosIFTS2`. El hashtag está fijo en el código; la variable `INSTAGRAM_HASHTAG` de `.env.example` no se usa (Manual Técnico, 12.4).
* **Protección editorial (`editadoPorAdmin`):** si el personal edita el título, fecha o descripción de un evento importado, la bandera `editadoPorAdmin: true` evita que sincronizaciones futuras pisen los cambios manuales.
* **Degradación elegante (*Graceful Degradation*):** si faltan credenciales o el token expira, el panel muestra el estado de la conexión y el botón de sincronizar queda deshabilitado. El sitio público sigue mostrando los eventos ya cargados, y el personal puede cargarlos a mano, con fotos desde la computadora o con el enlace de una publicación de Instagram (PR #133).

---

## 3. Consecuencias y Trade-offs

### Consecuencias Positivas
* **Resiliencia operativa:** los problemas de conexión con la API de Meta no impiden mostrar los eventos que ya están guardados en el sistema.
* **Supervisión humana:** el personal del instituto mantiene el control sobre qué publicaciones y textos ingresan al sitio oficial.
* **Cero sobrecosto:** evita consumir cuota de llamadas innecesarias o configurar tareas programadas complejas en Vercel.

### Consecuencias Negativas / Compromisos Asumidos
* **Renovación periódica manual:** el administrador debe generar y actualizar la variable `INSTAGRAM_TOKEN` cada 60 días en Vercel y `.env`, quedando la automatización completa mediante cron documentada como historia de usuario futura (`[US-11]`).
