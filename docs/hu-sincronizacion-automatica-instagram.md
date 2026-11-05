# Historia de Usuario: Sincronización Periódica y Renovación Automática de Instagram Graph API

**Código:** `[US-11]`  
**Épica:** Integraciones Externas y Automatización  
**Estado:** `Backlog / Flujo Futuro (Post-MVP)`  
**Dependencias:** `#39 [US-10]` (Integración inicial Instagram Graph API), `#64 [QA-03]` (Normalización defensiva)  

---

## 1. Descripción de la Historia de Usuario

> **Como** Administrador del Portal Web Institucional del IFTS N.° 2,  
> **Quiero** que el sistema consulte periódicamente nuevas publicaciones de la cuenta oficial de Instagram y renueve automáticamente la vigencia del token de acceso de larga duración,  
> **Para** mantener la cartelera de novedades y eventos actualizada sin requerir intervención manual periódica en el panel ni actualización manual de variables de entorno cada 60 días.

---

## 2. Contexto Técnico y Justificación del Desacople del MVP

Durante la Etapa 3 (MVP), el equipo completó e integró exitosamente la sincronización a demanda (`POST /api/instagram/sync`), la clasificación inteligente por hashtags (`#eventosIFTS2`), el soporte de publicaciones embebidas y la tolerancia a fallos offline con carga manual de eventos.

La automatización desatendida se programó para el flujo posterior al MVP debido a los siguientes requerimientos de arquitectura en entornos Serverless:

1. **Inmutabilidad de variables de entorno en Vercel:** Las funciones serverless de AWS Lambda / Vercel no tienen permisos en tiempo de ejecución para sobreescribir `process.env.INSTAGRAM_TOKEN`. La persistencia del token renovado requiere almacenarlo dinámicamente en la colección `InstagramSync` de MongoDB Atlas.
2. **Infraestructura de ejecución programada:** Demanda la configuración de tareas cron en `vercel.json` y la protección del endpoint mediante un secreto criptográfico compartido (`CRON_SECRET`).
3. **Estabilidad y congelamiento del MVP:** La suite de pruebas del servidor cuenta con 516 pruebas automáticas aprobadas. Para garantizar la entrega en fecha, se priorizó la robustez de la sincronización supervisada manual antes de introducir procesos asíncronos desatendidos.

---

## 3. Criterios de Aceptación (Gherkin)

### Escenario 1: Consulta automática programada de nuevas publicaciones
* **Dado** que la cuenta de Instagram está conectada con credenciales válidas en la base de datos o variables de entorno,
* **Cuando** el planificador de tareas (Vercel Cron) ejecuta la invocación periódica programada (ej. diaria a las 04:00 UTC) enviando el encabezado `Authorization: Bearer <CRON_SECRET>`,
* **Entonces** el servidor ejecuta la rutina `sincronizarInstagram`, importa las publicaciones recientes con el hashtag institucional `#eventosIFTS2`, actualiza `feedCache` y registra la fecha en `ultimaSincronizacion`.

### Escenario 2: Protección y seguridad del endpoint de cron
* **Dado** un visitante o cliente externo que intenta acceder al endpoint de sincronización automática,
* **Cuando** envía una petición sin el encabezado `Authorization` o con un token diferente de `CRON_SECRET`,
* **Entonces** el servidor rechaza inmediatamente la petición con código de estado HTTP `401 Unauthorized` y no consume cuota de la Graph API de Meta.

### Escenario 3: Renovación preventiva automática del token de larga duración
* **Dado** un token de acceso de larga duración de Meta Graph API cuya antigüedad supera los 45 días (vencimiento a los 60 días),
* **Cuando** se ejecuta la tarea de mantenimiento programada,
* **Entonces** el servicio invoca el endpoint de refresco de Meta (`GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`),
* **Y** persiste el nuevo token retornado junto con su nueva fecha de expiración en el documento de configuración `InstagramSync` en MongoDB Atlas.

### Escenario 4: Manejo resiliente ante expiración irreversible o revocación
* **Dado** que el usuario cambió la contraseña de la cuenta de Instagram o revocó los permisos de la aplicación en Meta,
* **Cuando** la tarea automática detecta un error de tipo `OAuthException` (código 190),
* **Entonces** el sistema actualiza el estado a `error_autenticacion`, deshabilita la bandera `conectado` en la base de datos, envía un aviso al registro del servidor y preserva el feed histórico existente sin romper la visualización pública.

---

## 4. Tareas Técnicas Sugeridas (Desglose de Implementación)

- [ ] **TK-11.1 (Persistencia de Credenciales en MongoDB):**
  - Extender el esquema `instagramSyncSchema` en `server/src/models/InstagramSync.js` para almacenar de forma cifrada `tokenAcceso` y `tokenExpiraEn`.
  - Modificar `server/src/services/instagram/meta.js` para priorizar el token almacenado en MongoDB sobre el fallback de `config.instagramToken`.
- [ ] **TK-11.2 (Servicio de Renovación de Token):**
  - Implementar la función `renovarTokenInstagram({ tokenActual })` que consulte el endpoint de refresco de Graph API.
  - Almacenar la nueva clave y actualizar la marca temporal en la base de datos.
- [ ] **TK-11.3 (Ruta y Controlador de Cron):**
  - Crear la ruta `POST /api/instagram/cron` (o `GET /api/instagram/cron` según convención de Vercel).
  - Implementar middleware de validación para `req.headers.authorization === Bearer ${config.cronSecret}`.
- [ ] **TK-11.4 (Configuración en Vercel):**
  - Agregar la sección `crons` en `vercel.json`:
    ```json
    "crons": [
      {
        "path": "/api/instagram/cron",
        "schedule": "0 7 * * *"
      }
    ]
    ```
  - Configurar la variable `CRON_SECRET` en el panel de Vercel.
- [ ] **TK-11.5 (Pruebas Automatizadas):**
  - Crear `server/test/instagram.cron.test.js` con dobles en memoria para validar la ejecución con secreto válido, el rechazo ante peticiones no autorizadas y la simulación del refresco de token ante respuestas simuladas de Meta.
