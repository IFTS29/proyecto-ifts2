# Plan de Testing y Estrategia de Calidad (QA)

**Proyecto:** Portal Web Institucional IFTS N.° 2  
**Equipo:** 404-Solutions · Prácticas Profesionalizantes IV (IFTS N.° 29)  
**Estado del documento:** Versión inicial de referencia (documento vivo, evoluciona por sprint)  
**Issues vinculadas:** `#40 [QA-01]`, `#41 [QA-02]`, `#64 [QA-03]`, `#34 [US-05]`, `#39 [US-10]`, `#62 [UI-02]`, `#63 [SETUP-03]`, `#65 [POST-03]`

---

## 1. Propósito y Enfoque

Este documento define la estrategia de pruebas del proyecto para garantizar que cada funcionalidad entregada sea **estable, segura y reproducible**.

En lugar de postergar todas las pruebas para el cierre del proyecto, el equipo adopta un enfoque de **pruebas continuas y escalonadas (*Shift-Left Testing*)**:

1. **Pruebas junto al desarrollo:** cada módulo crítico incorpora sus pruebas unitarias y de borde en el mismo sprint en que se construye.
2. **Reproducibilidad total (100% offline):** la suite automática (`npm test`) se ejecuta en menos de 2 segundos en cualquier máquina sin requerir conexión a Internet, base de datos MongoDB Atlas activa, servidor SMTP real ni consumo de cuota en Cloudinary o Meta Graph API.
3. **Datos reales de prueba (no inventados):** los *fixtures* de prueba se construyen a partir de las respuestas reales obtenidas de la cuenta de Instagram de prueba (`@proyecto.404solutions.ifts2` en el repositorio `instagram-poc`), contemplando los casos bordes reales de la API de Meta.

---

## 2. Arquitectura de Pruebas en el Repositorio

El servidor (`server/`) está diseñado con **inyección de dependencias** en `crearApp({ config, usuarios, limitadorLogin, ... })`. Esto permite intercambiar las implementaciones externas por dobles en memoria durante las pruebas:

| Componente | En Producción / Staging | En Suite de Pruebas (`npm test`) |
| :--- | :--- | :--- |
| **Ejecutor y aserciones** | — | `node:test` + `node:assert/strict` + `supertest` |
| **Persistencia de datos** | MongoDB Atlas (`*.mongo.js`) | Repositorios en memoria (`*.memoria.js`) |
| **Envío de correos** | Nodemailer SMTP Gmail | Transporte simulado / validación de payload |
| **Almacenamiento multimedia** | Cloudinary SDK (`server/src/config/cloudinary.js`) | Adaptador mock con validación de parámetros y URLs |
| **API de Instagram** | Meta Graph API (`v26.0`) | Fixtures deterministas (`server/test/fixtures/`) |

---

## 3. Escalado de Pruebas por Sprint

### 3.1. Línea Base Alcanzada (Sprint 1 — ✅ 81 pruebas activas)

Actualmente en `server/test/` se ejecutan y aprueban 81 pruebas automáticas que cubren:

- **`salud.test.js`:** disponibilidad de `/api/salud` y manejo de rutas inexistentes (`404` en JSON).
- **`passwords.test.js`:** política de contraseñas (mínimo 8 caracteres, mayúscula y número) y hashing con `bcryptjs`.
- **`auth.test.js`:** inicio de sesión JWT, rechazo de credenciales inválidas, resistencia a enumeración de usuarios por tiempos de respuesta y bloqueo tras 5 intentos fallidos por cuenta de correo (inmune a rotación de IP en `X-Forwarded-For`).
- **`usuarios.test.js`:** CRUD de `/api/users`, permisos exclusivos de Administrador (`403` para Bedelía), prohibición de auto-eliminación o auto-degradación de rol y resguardo del último administrador activo.
- **`seed.test.js`:** creación idempotente del administrador inicial.
- **`contacto.test.js`, `contacto.limite.test.js`, `correo.*.test.js`:** validaciones del formulario público (RF07), sanitización, anti-spam / rate-limiting y armado del correo a Bedelía.

---

### 3.2. Sprint 2: Pruebas Unitarias Defensivas y CRUDs Principales (`[QA-03]`)

En el Sprint 2 el foco está en blindar la lógica pura de normalización multimedia, el contrato de datos para los carruseles (`[UI-02]`), la configuración de Cloudinary (`[SETUP-03]`) y los nuevos CRUDs:

1. **Pipeline de normalización y clasificación de Instagram (`#64 [QA-03]`):**
   - **Fixtures deterministas (`server/test/fixtures/instagram-edge-cases.json`):** lote fijo de publicaciones extraídas de `@proyecto.404solutions.ifts2` combinado con casos anómalos controlados.
   - **Parser de textos (`parseCaption`):** extracción de título editorial, fecha formateada (`Mes Año`) y limpieza de hashtags al pie; respuesta segura ante `null`, `undefined`, cadenas vacías o textos de más de 2.000 caracteres sin saltos de línea.
   - **Clasificador por categorías (`classifyPosts`):** detección insensible a mayúsculas/minúsculas de `#ifts2novedades` e `#ifts2eventos`, soporte de publicaciones con ambos hashtags y descarte de posteos sin etiqueta institucional.
   - **Deduplicación y filtrado (`deduplicateFeed`):** prevención de tarjetas duplicadas por `id` o `permalink` y exclusión de publicaciones marcadas como descartadas.
   - **Blindaje visual:** asignación de `placeholder.svg` ante ausencia de URL y póster de respaldo para videos sin miniatura.
2. **Adaptador de Cloudinary (`#63 [SETUP-03]`):**
   - Verificación unitaria de construcción de opciones de subida (carpetas `ifts29/events` e `ifts29/instagram`, transformaciones `q_auto,f_auto` y generación de miniatura de video).
   - Manejo controlado de errores si el servicio externo rechaza un archivo o vence el tiempo de espera.
3. **CRUDs de Eventos, Información Académica y Contenido (`#33`, `#34`, `#35`, `#36`):**
   - Pruebas con `supertest` y repositorios `*.memoria.js` validando alta, edición, lectura pública, límite de hasta 20 fotos por evento, validación de enlaces y archivado lógico sin borrado físico (`RF12`).

---

### 3.3. Sprint 3: Pruebas de Integración, Sincronización y Evidencias (`[QA-01]`, `[QA-02]`)

En el Sprint 3 se valida la integración entre módulos y se documentan las evidencias exigidas para la entrega académica:

1. **Integración del servicio de sincronización con Instagram (`#39 [US-10]`):**
   - Simulación del flujo completo `Meta Graph API ➔ Cloudinary ➔ Repositorio de Eventos/Feed`:
     - Respuesta `200 OK` con los tres tipos de medios reales (`IMAGE`, `VIDEO`, `CAROUSEL_ALBUM` con `children`).
     - Respuesta `401 / 190` (token expirado o cuenta en revisión) y `429` (rate limit): comprobar que el servidor **no cae**, registra el evento y mantiene operativo el sitio con los datos ya persistidos y la carga manual (mecanismo de contingencia RF13).
   - Protección del endpoint `POST /api/instagram/sync` (solo rol Administrador autenticado).
2. **Consolidación de la Suite Académica (`#40 [QA-01]`):**
   - Selección y documentación formal de casos unitarios y de integración con tablas de *Entrada / Salida Esperada / Salida Obtenida* y capturas de ejecución en consola.
3. **Validación visual de las 4 operaciones CRUD (`#41 [QA-02]`):**
   - Recorrido completo de **Create, Read, Update y Delete/Archivado** con cliente y servidor levantados, registrando capturas paso a paso para el informe y la defensa oral.

---

### 3.4. Post-MVP: Moderación Interactiva y Regresión Visual (`[POST-03]`)

Para las mejoras posteriores al MVP se contemplan:

1. **Flujo de Papelera y Restauración (`#65 [POST-03]`):**
   - Descartar una publicación sincronizada (`status: "discarded"`), verificar que desaparece de `/api/feed`, ejecutar una nueva sincronización simulada comprobando que **no se vuelve a publicar**, y finalmente invocar `PUT /api/posts/:id/restore` comprobando su regreso al feed público.
2. **Pruebas End-to-End (E2E) en navegador:**
   - Verificación automatizada de los carruseles en `Inicio.jsx` y `Eventos.jsx` (`#62 [UI-02]`): adaptación de 1-2 tarjetas fijas vs. 3+ con desplazamiento, apertura del modal Lightbox, navegación entre fotos de un álbum (`X / Total`) y activación del placeholder ante una imagen rota (`onError`).

---

## 4. Matriz de Casos de Prueba — Módulo Instagram, Eventos y Multimedia

Esta matriz sirve como guía de implementación para `#64 [QA-03]`, `#62 [UI-02]` y `#39 [US-10]`:

| ID | Caso de Prueba | Entrada / Estímulo | Resultado Esperado | Nivel / Sprint | Issue |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **CP-IG-01** | Publicación estándar con imagen (`IMAGE`) | Post de `@proyecto.404solutions.ifts2` con primera línea de título, descripción y `#ifts2eventos` | `parseCaption` separa título y cuerpo limpio; se clasifica en `eventos` con fecha formateada | Unitario (Sprint 2) | `#64` |
| **CP-IG-02** | Publicación sin texto (`caption: null` o `""`) | Objeto de medio válido pero sin campo `caption` | No lanza excepción; asigna título institucional por defecto y conserva la fecha del timestamp | Unitario (Sprint 2) | `#64` |
| **CP-IG-03** | Publicación con solo hashtags | `caption: "#ifts2novedades #ifts2eventos"` | Se clasifica en ambas categorías, limpia los hashtags del cuerpo y asigna título por defecto | Unitario (Sprint 2) | `#64` |
| **CP-IG-04** | Texto extremo sin saltos de línea (>2.000 caracteres) | String continuo con emojis y múltiples hashtags | El parser procesa sin bloqueo; la tarjeta aplica `line-clamp` y el modal habilita scroll vertical | Unitario / UI (Sprint 2) | `#62`, `#64` |
| **CP-IG-05** | Álbum (`CAROUSEL_ALBUM`) con múltiples fotos | Post con arreglo `children` de 4 imágenes | Se persiste la colección completa; el modal permite navegar `1 / 4` a `4 / 4` | Unitario / UI (Sprint 2) | `#62`, `#64` |
| **CP-IG-06** | Álbum con un elemento intermedio roto (`404`) | Foto 2 de 4 con URL inaccesible | La foto 2 muestra `/img/placeholder.svg` sin romper el tamaño `16/10` ni bloquear el paso a las fotos 3 y 4 | UI / Integración (Sprint 2) | `#62`, `#64` |
| **CP-IG-07** | Video (`VIDEO`) sin miniatura (`thumbnail_url: null`) | Post de video MP4 donde Meta no envía miniatura | Se asigna póster de respaldo o miniatura generada por Cloudinary; el `<video controls>` no queda en negro | Unitario / Infra (Sprint 2) | `#63`, `#64` |
| **CP-IG-08** | Sincronización de publicación repetida | La API devuelve un post cuyo `id` o `permalink` ya existe | `deduplicateFeed` actualiza o conserva una única instancia; nunca duplica tarjetas en el carrusel | Unitario / Integración (Sprint 2–3) | `#64`, `#39` |
| **CP-IG-09** | Sincronización de publicación previamente descartada | El administrador descartó el post `X` y corre una nueva sincronización | El sincronizador consulta la lista de descartados y omite `X` sin volver a mostrarlo ni re-subirlo | Unitario / Integración (Sprint 2–3) | `#64`, `#39` |
| **CP-IG-10** | Caída o bloqueo preventivo de cuenta en Meta | Graph API responde `400/401/429` o timeout | El endpoint devuelve error controlado al panel, conserva intacto el feed existente y permite carga manual (`US-05`) | Integración (Sprint 3) | `#39`, `#40` |
| **CP-IG-11** | Restauración desde Papelera (Soft-Delete) | Admin ejecuta `PUT /api/posts/:id/restore` sobre post descartado | El post vuelve al estado activo en el feed público y persiste tras futuras sincronizaciones | Integración (Post-MVP) | `#65` |

---

## 5. Ejecución y Criterios de Calidad para el Equipo

### Comandos de ejecución

```powershell
# Ejecutar toda la suite automática del servidor
npm test

# Ejecutar únicamente un archivo de pruebas específico durante el desarrollo
node --test server/test/instagram.test.js
```

### Reglas para Pull Requests hacia `develop`

1. **Ningún PR puede romper las pruebas existentes:** antes de abrir un Pull Request, `npm test` y `npm run build` deben finalizar sin errores.
2. **Toda lógica nueva incluye su prueba:** si se agrega un nuevo endpoint, validador o parser, se acompaña de sus casos felices y de error en `server/test/`.
3. **Cero secretos ni llamadas reales en tests:** las pruebas nunca deben leer `.env` ni conectarse a credenciales reales de Meta, Cloudinary, Gmail o MongoDB Atlas.
4. **Trazabilidad en commits:** los commits de pruebas siguen el estándar del proyecto (`test(alcance): descripción corta` + cuerpo explicativo + referencia al issue `#64` o `#40`).
