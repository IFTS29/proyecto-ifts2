# Manual técnico del Portal Web Institucional IFTS N.° 2

Este documento está dirigido a quien tenga que instalar, mantener o continuar el desarrollo del portal. Describe cómo está construido, cómo se ejecuta y cómo se prueba. Está escrito sobre la versión definitiva de la rama `develop` para la entrega final de la Etapa 3.

## 1. Introducción

El IFTS N.° 2 (Tecnicatura Superior en Emprendimientos Gastronómicos) tenía un sitio en Google Sites que dejó de actualizarse. El portal lo reemplaza con dos partes:

- Un **sitio público**: inicio, carrera, ingreso, información para alumnos (horarios y mesas de examen), eventos y contacto.
- Un **panel de administración**, para que el personal del instituto cargue y actualice ese contenido sin intervención del equipo de desarrollo. Cuenta exclusivamente con dos perfiles operativos: Administrador y Bedelía (descartando perfiles adicionales como superadministrador por definición institucional).

Lo desarrolló el equipo 404-Solutions del IFTS N.° 29 como proyecto integrador de Prácticas Profesionalizantes IV. Quedan fuera del alcance: reemplazar SIU Guaraní o Moodle, gestionar legajos, resolver trámites dentro del portal, una aplicación móvil nativa y borrar contenido institucional de forma automática (según el análisis de la Etapa 2).

El manual de uso del panel está en [manual-de-usuario.md](./manual-de-usuario.md).

## 2. Arquitectura del sistema

El sistema tiene tres capas:

```text
  Navegador ──► client/  React + Vite (sitio público y panel)
                  │  peticiones a /api/...
                  ▼
               server/  Node.js + Express (rutas, servicios, repositorios)
                  │
                  ├──► MongoDB Atlas (datos)
                  └──► Servicios externos: Cloudinary (fotos), Instagram Graph API,
                       SMTP (correo del formulario de contacto)
```

| Capa | Tecnologías (versiones de `package.json`) |
|---|---|
| Presentación | React 18.3, React Router 6.26, Vite 5.4 |
| Lógica | Node.js, Express 4, JSON Web Token, bcryptjs, helmet, express-rate-limit, pdfkit, nodemailer |
| Datos | MongoDB con Mongoose 8; Cloudinary para las fotos de los eventos |
| Despliegue | Vercel (el cliente compilado como sitio estático y la API como función) |
| Pruebas | `node:test` y supertest |

Tres decisiones de estructura explican gran parte del código:

1. **Inyección de dependencias en `crearApp`.** `server/src/app.js` exporta `crearApp({ config, usuarios, eventos, horarios, ... })`. Recibe los repositorios, el servicio de correo, el limitador y el reloj (`hoy`) por parámetro. En producción se le pasan los de MongoDB. En desarrollo sin base de datos y en las pruebas se le pasan los de memoria.
2. **Repositorios con dos implementaciones.** Cada entidad tiene un `*.memoria.js` y un `*.mongo.js` en `server/src/repos/`, con la misma interfaz. `server/src/arranque.js` elige todos de una fuente: o todos en MongoDB o todos en memoria.
3. **Datos de trabajo y datos publicados.** Los horarios y las mesas se cargan como datos de trabajo, y lo que ven los alumnos es una copia aparte que se genera al publicar. Guardar no cambia el sitio. Los detalles están en el apartado 9.

## 3. Estructura del proyecto

```text
proyecto-ifts2/
├── package.json         # dependencias y scripts de todo el proyecto
├── server.js            # arranque en desarrollo y producción local (puerto 3000)
├── api/index.js         # entrada de la API en Vercel
├── vercel.json          # compilación y reescrituras de Vercel
├── .env.example         # variables de entorno, sin valores
├── client/              # frontend (React + Vite)
│   ├── src/pages/       # una pantalla por archivo (sitio público y panel)
│   ├── src/components/  # formularios, tablas, menú del panel, modales, rutas protegidas
│   ├── src/context/     # AuthContext: sesión y rol
│   ├── src/api.js       # llamadas a /api y manejo del token
│   └── public/docs/     # PDF que publica el sitio (plan de estudios, correlatividades, guía de preingreso)
├── server/
│   ├── src/app.js       # crearApp: arma Express y monta las rutas
│   ├── src/config.js    # lee las variables de entorno
│   ├── src/arranque.js  # elige repositorios (MongoDB o memoria) y crea el primer administrador
│   ├── src/routes/      # una por área: auth, usuarios, eventos, academica, mesas, contenido, instagram, contacto
│   ├── src/services/    # reglas de negocio, correo, archivado, PDF, Instagram, fotos
│   ├── src/repos/       # acceso a datos (memoria y MongoDB)
│   ├── src/models/      # esquemas de Mongoose
│   ├── src/middleware/  # autenticación y control de rol
│   ├── scripts/         # seed-admin.js
│   └── test/            # 39 archivos de prueba
├── docs/                # documentación del equipo
└── prototipo-html/      # prototipo original (referencia, no se publica)
```

## 4. Base de datos

La base es MongoDB, que guarda documentos y no tablas. Por eso las relaciones entre colecciones son lógicas: un campo guarda el identificador de otro documento y MongoDB no lo verifica. Mongoose define los esquemas en `server/src/models/`.

### 4.1 Diagrama entidad-relación

```mermaid
erDiagram
    USUARIO {
        string nombre
        string mail UK
        string rol "admin o bedelia"
        string passwordHash
    }
    EVENTO {
        string origen "manual o instagram"
        string instagramId UK
        string titulo
        string resumen
        string descripcion
        date fechaEvento
        boolean visibleSiempre
        string estado "visible, oculto, archivado"
        string fotoPrincipal
    }
    HORARIO {
        number cicloLectivo
        number cuatrimestre
        number anioCarrera
        string turno
        string materia
        string profesor
        string aula
        string origenId
    }
    PUBLICACION_HORARIOS {
        number cicloLectivo
        number cuatrimestre
        boolean publicado
        date publicadoEn
    }
    LLAMADO {
        string nombre
        string nombreClave UK
        string desde
        string hasta
        string aviso
    }
    MESA_EXAMEN {
        string llamadoId
        string materia
        number anioCarrera
        string fecha
        string hora
        string aula
        string tribunal
    }
    CONTENIDO_INSTITUCIONAL {
        string clave UK
        mixed datos
        date actualizadoEn
        string actualizadoPor
    }
    CONVOCATORIA_ANTERIOR {
        string convocatoria UK
        mixed datos
        date guardadaEn
    }
    INSTAGRAM_SYNC {
        string clave UK
        boolean conectado
        date ultimaSincronizacion
        string estado
    }

    LLAMADO ||--o{ MESA_EXAMEN : "llamadoId"
    LLAMADO ||--o| LLAMADO_PUBLICADO : "embebe"
    HORARIO }o--|| PUBLICACION_HORARIOS : "mismo período"
    PUBLICACION_HORARIOS ||--o{ HORARIO_PUBLICADO : "embebe"
    EVENTO ||--o{ MEDIO : "embebe"
    LLAMADO_PUBLICADO ||--o{ MESA_PUBLICADA : "embebe"
```

`LLAMADO_PUBLICADO`, `HORARIO_PUBLICADO`, `MESA_PUBLICADA` y `MEDIO` no son colecciones: son subdocumentos que viven dentro de otro documento. Si el visor de Markdown no dibuja el diagrama, la misma imagen está en [der.png](./der.png).

### 4.2 Colecciones

| Colección | Modelo | Qué guarda |
|---|---|---|
| `usuarios` | `Usuario` | Cuentas del panel. `rol` es `admin` o `bedelia`. La contraseña se guarda con hash (bcrypt), nunca en texto. `mail` es único y se guarda en minúsculas. |
| `eventos` | `Evento` | Eventos de la galería. Pueden ser manuales o venir de Instagram (`origen`). `estado` es `visible`, `oculto` o `archivado`. Incluye la lista de fotos (`medios`) y un registro de las fotos quitadas desde el panel (`mediosQuitados`). `instagramId` es único para los eventos que vienen de Instagram. |
| `horarios` | `Horario` | Datos de trabajo: una materia de un período, con docente, aula y una o más franjas (`dias`: día, desde, hasta). `origenId` evita duplicar al reutilizar horarios de otro período. |
| `publicaciones_horarios` | `PublicacionHorarios` | Lo que ven los alumnos: un documento por período (único por `cicloLectivo` y `cuatrimestre`), con una copia de las materias en el momento de publicar. |
| `llamados` | `Llamado` | Un llamado de mesas de examen (por ejemplo, «Febrero 2027»). `nombreClave` impide dos llamados con el mismo nombre. El campo `publicacion` guarda la copia publicada, con sus mesas; vale `null` si nunca se publicó. |
| `mesas_examen` | `MesaExamen` | Datos de trabajo: una mesa de un llamado (`llamadoId`). Fecha y hora pueden quedar vacías («A confirmar»). |
| `contenidoinstitucional` | `ContenidoInstitucional` | Una sección editable del contenido institucional. `clave` es una de `perfil`, `personas`, `contacto`, `ingreso`, `ingresoPreguntas`. `datos` guarda el contenido ya validado. |
| `convocatoriasanteriores` | `ConvocatoriaAnterior` | Historial de convocatorias de ingreso, una copia por convocatoria. Solo de consulta. |
| `instagramsyncs` | `InstagramSync` | Estado de la sincronización con Instagram (un solo documento, `clave: "global"`), las publicaciones descartadas y el feed guardado. |

### 4.3 Relaciones

- **Llamado → MesaExamen** (uno a muchos): la mesa guarda `llamadoId`.
- **Horario → PublicacionHorarios**: no hay un campo que los una. Pertenecen al mismo período cuando coinciden `cicloLectivo` y `cuatrimestre`. Cada materia publicada guarda `horarioId`, que apunta al horario de trabajo del que salió, para poder mostrar qué cambió desde la última publicación.
- **Mesa publicada → MesaExamen**: igual, con `mesaId`.
- **Usuario**: ninguna colección lo referencia. El token de sesión lleva su identificador (`sub`).
- El contenido institucional, las convocatorias anteriores y el estado de Instagram no se relacionan con otras colecciones.

### 4.4 Creación y restauración

No hay scripts SQL ni procedimientos manuales para la creación de la base: Mongoose define los esquemas y crea las colecciones e índices automáticamente la primera vez que interactúa con ellas.

- **Administrador inicial:** se asegura de forma automática al arrancar (`server/src/arranque.js` y `server/src/services/seed.js`), siempre que la colección `usuarios` esté vacía y se definan las variables `SEED_ADMIN_MAIL` y `SEED_ADMIN_PASSWORD` (provistas por defecto en `.env.example`). Alternativamente, existe el script manual `npm run seed:admin --prefix server` (`server/scripts/seed-admin.js`) para inicializar el administrador por línea de comandos.
- **Contenido institucional:** las secciones editables no requieren precarga en base de datos; mientras no hayan sido modificadas desde el panel, el servidor provee los valores institucionales por defecto definidos en `server/src/services/contenido.js`.
- **Restauración y respaldo:** para conectar una nueva instancia, basta con configurar la variable `MONGODB_URI` apuntando al clúster correspondiente. La política de copias de seguridad se apoya en los respaldos automáticos y snapshots programados de MongoDB Atlas, mientras que las imágenes y recursos multimedia se preservan de manera persistente en Cloudinary.

## 5. Configuración e instalación

### 5.1 Requisitos

- **Node.js 22** (LTS recomendado; verificado con Node.js 22.x) y npm 10+.
- **Git**.
- **Opcionales para desarrollo local:** clúster de MongoDB Atlas, cuenta de Cloudinary, credenciales de Instagram Graph API y servidor SMTP. En ausencia de estos servicios externos, el portal opera 100% funcional en modo memoria y con almacenamiento y emulación local.

### 5.2 Dependencias

Todas las dependencias del proyecto están centralizadas en el `package.json` de la raíz (React, Vite, Express, Mongoose, Nodemailer, PDFKit, etc.). Se instalan con un solo comando desde la raíz:

```bash
npm install
```

*(Nota: el backend y el frontend conservan sus propios `package.json` en `server/` y `client/` para habilitar flujos de trabajo desacoplados o ejecución aislada de scripts).*

### 5.3 Pasos para instalación y ejecución en desarrollo local

El proyecto cuenta con un archivo `.env.example` preparado con valores funcionales por defecto para que cualquier desarrollador o evaluador pueda clonar, inicializar y comenzar a probar inmediatamente sin configurar servicios externos:

```bash
git clone https://github.com/IFTS29/proyecto-ifts2.git
cd proyecto-ifts2
npm install
cp .env.example .env      # en PowerShell: Copy-Item .env.example .env
```

El archivo `.env.example` ya viene listo con las credenciales de desarrollo para el panel:
- **Usuario:** `admin@ifts2.edu.ar`
- **Contraseña:** `Admin1234!`
- **Puerto:** `3000` (configurable mediante `PORT`)

Para iniciar la aplicación completa (sitio público + API + panel):

```bash
npm run dev
```

El servidor integrado inicia en `http://localhost:3000` ejecutando Express y sirviendo el cliente React mediante Vite en modo middleware. El panel administrativo se encuentra disponible directamente en `http://localhost:3000/login`.

> **Modo desacoplado / modular (opcional):** si se desea trabajar exclusivamente sobre la API o el frontend por separado, es posible ejecutar `npm run dev --prefix server` (inicia la API en `http://localhost:4000` mediante `server/src/index.js`) y en otra terminal `npm run dev --prefix client` (inicia el servidor Vite en `http://localhost:5173`, el cual reenvía las peticiones `/api` al puerto 4000).

**Producción local:**
Para simular el entorno de producción localmente:
```bash
npm run build
npm start
```
`npm run build` genera el paquete compilado en `client/dist`, y `npm start` lo sirve junto con la API en modo producción (`NODE_ENV=production`). En este modo, la conexión a MongoDB Atlas es obligatoria (`MONGODB_URI`).

### 5.4 Variables de entorno

Se leen de forma centralizada en `server/src/config.js`. El archivo `.env` nunca debe subirse al repositorio.

| Variable | Para qué sirve | Valor por defecto en `.env.example` / Comportamiento si falta |
|---|---|---|
| `PORT` | Puerto de escucha del servidor local integrado. | `3000`. |
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas. | Si falta en local: modo memoria temporal. En producción/Vercel: el servidor no arranca. |
| `JWT_SECRET` | Clave secreta para firmar los JSON Web Tokens de sesión. | `secreto-desarrollo-ifts2-2026` (En producción en Vercel se define una clave criptográfica privada). |
| `JWT_DURACION` | Tiempo de expiración del token de sesión. | `8h`. |
| `BCRYPT_COSTO` | Rondas de sal para el algoritmo bcryptjs. | `10`. |
| `SEED_ADMIN_NOMBRE` | Nombre del administrador inicial generado automáticamente. | `Administrador`. |
| `SEED_ADMIN_MAIL` | Correo de acceso del administrador inicial. | `admin@ifts2.edu.ar`. |
| `SEED_ADMIN_PASSWORD` | Contraseña de acceso del administrador inicial. | `Admin1234!`. |
| `SITIO_URL` | URL canónica pública para enlaces institucionales en PDFs. | `http://localhost:3000` (en Vercel se autodetecta mediante `VERCEL_URL`). |
| `CLIENT_URL` | Origen permitido para peticiones y redirecciones del cliente. | `http://localhost:3000`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales para subida persistente de fotos de eventos. | Si faltan en local: guarda temporalmente en disco. En producción/Vercel: deshabilita carga de fotos nuevas (503). |
| `INSTAGRAM_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_HASHTAG` | Credenciales para sincronización con Meta Graph API (`#eventosIFTS2`). | Si faltan: la sincronización se deshabilita en el panel y los eventos se gestionan manualmente con flyers y fotos. |
| `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CLAVE` | Credenciales para el envío de correos del formulario de contacto. | Si faltan en local: envío simulado en consola. En producción: informa error en el formulario si fallan. |
| `CORREO_BEDELIA`, `CORREO_INSTITUCIONAL` | Casillas destinatarias según el motivo de consulta. | Requeridas para direccionamiento de mensajes del formulario. |

### 5.5 Despliegue en Vercel

A diferencia de la ejecución local donde `server.js` unifica Express y Vite en un único proceso Node.js, en la plataforma Serverless de Vercel la arquitectura opera desacoplada:

1. **Frontend estático:** `vercel.json` ejecuta `npm run build`, compilando la aplicación React en assets estáticos bajo `client/dist`, distribuidos globalmente a través de la red Edge de Vercel.
2. **API Serverless:** cada petición con prefijo `/api/...` se enruta hacia la función serverless en `api/index.js`, la cual instancia la aplicación Express reutilizando conexiones en memoria entre invocaciones cálidas (*warm starts*).
3. **Generación de PDFs en la nube:** `vercel.json` incorpora `includeFiles: ["node_modules/pdfkit/js/data/**"]` para empaquetar las fuentes tipográficas estándar que requiere `pdfkit` dentro del entorno de ejecución serverless de AWS Lambda/Vercel.
4. **Configuración de entorno:** las variables de entorno se definen directamente en el panel de control de Vercel (*Project Settings -> Environment Variables*), garantizando que ningún secreto resida en el repositorio.
5. **Tolerancia a fallas:** si la base de datos MongoDB Atlas experimenta una indisponibilidad momentánea, la función serverless responde `503 Service Unavailable` («El servicio no está disponible en este momento») sin almacenar un estado fallido permanente, reintentando automáticamente en la petición subsiguiente.

### 5.6 Credenciales de prueba

- **Desarrollo local:** las credenciales iniciales de administrador vienen preconfiguradas y listas para usar en `.env.example` (`admin@ifts2.edu.ar` / `Admin1234!`).
- **Entorno desplegado en producción (Vercel):** por estrictas razones de seguridad y buenas prácticas, las cuentas y contraseñas de los entornos públicos no se publican en el repositorio abierto y se remiten a la cátedra evaluadora a través de los canales de comunicación privados designados.

## 6. Componentes principales

### 6.1 Servidor

**Arranque.** `server.js` lee la configuración (`leerConfig`), llama a `prepararDatos` (`arranque.js`) y crea la app con `crearApp`. En desarrollo monta Vite como middleware, y en producción sirve `client/dist`. En Vercel, `api/index.js` hace lo mismo pero devuelve la app a través de una función que atiende cada petición.

**Autenticación y roles** (`middleware/auth.js`).
- `autenticar` exige un token `Bearer`, lo verifica y busca al usuario. Si el usuario fue eliminado, el token deja de valer aunque no haya vencido.
- `requiereRol("admin")` o `requiereRol("admin", "bedelia")` limita la ruta a esos perfiles y responde 403 al resto.
- El login (`routes/auth.js`) compara la contraseña aun cuando el correo no exista, contra un hash de relleno, para que la demora no revele qué correos están registrados.

**Limitadores** (`express-rate-limit`).
- Login: 5 intentos fallidos por correo y 15 minutos de bloqueo. Cuenta por correo y no por IP, porque la IP se puede falsear. El contador vive en memoria: con varias instancias en Vercel, cada una lleva el suyo.
- Contacto: 10 envíos por visitante en 15 minutos.

**Rutas.** El prefijo es `/api`.

| Prefijo | Quién accede | Qué hace |
|---|---|---|
| `GET /salud` | Público | Responde `{"estado":"ok"}`. |
| `/auth` (`POST /login`, `GET /yo`) | Login público; `/yo` con sesión | Inicia sesión y devuelve el usuario de la sesión. |
| `/users` | Administrador | Alta, edición y baja de usuarios. |
| `/events` | Público: `GET /` y `GET /:id`. Administrador: el resto | Alta, edición, cambio de estado (mostrar u ocultar) y de «visible siempre». No hay baja. |
| `/academic` (horarios) | Público: `GET /vigente` y `GET /vigente/horarios.pdf`. Administrador y Bedelía: el resto | Períodos, horarios, reutilización, publicar, retirar y vista previa en PDF. |
| `/academic` (mesas) | Público: `GET /vigente/mesas.pdf`. Administrador y Bedelía: el resto | Llamados y mesas: alta, edición, baja, publicar, retirar y vista previa en PDF. |
| `/content` | Público: `GET /`. Administrador: `PUT /:clave` y `GET /ingreso/historial` | Lee y guarda las cinco secciones de contenido institucional. |
| `/instagram` | Público: `GET /status` y `GET /feed`. Administrador: `POST /sync` | Estado y feed de Instagram; sincronización manual. |
| `POST /contact` | Público, con límite de envíos | Valida la consulta y la envía por correo. |

**Servicios** (`server/src/services/`).
- `academica.js` y `mesas.js`: reglas de horarios, mesas y llamados. Validan los datos y devuelven mensajes en español.
- `archivo.js`: calcula qué contenido se ve y cuál pasa al archivo (apartado 9).
- `contenido.js`: límites y validación de las cinco secciones, y los valores iniciales.
- `academica.pdf.js` y `routes/pdf.js`: generan los PDF de horarios y mesas con `pdfkit`.
- `correo.smtp.js`, `correo.mensaje.js`, `correo.memoria.js`: arman y envían los correos del formulario. Si el servidor SMTP rechaza una de las dos casillas, el mensaje igual llegó a la otra: se registra la advertencia y no se reintenta para no duplicarlo.
- `instagram/`: sincronización con la API (`meta.js`), interpretación de los textos de cada publicación (`parser.js`) y almacenamiento del feed (`feed.js`).
- `media/`: guarda las fotos en Cloudinary (`cloudinary.js`, `fotosEventos.js`) o en disco en desarrollo (`local.js`). `galeriaEvento.js` valida la lista de fotos de un evento (máximo 20).
- `limitador.js`, `limitador.contacto.js`, `passwords.js` (regla de contraseñas y hash), `seed.js` (primer administrador).

### 6.2 Cliente

- `App.jsx` define las rutas. Las del sitio público usan `Layout` (encabezado y pie). Las del panel van dentro de `SoloAutenticados`, y las de Eventos, Contenido y Usuarios, además, dentro de `SoloAdministrador`.
- `context/AuthContext.jsx` guarda el usuario y su rol. Al abrir la página verifica el token guardado con `GET /api/auth/yo`.
- `SesionFlotante.jsx` y menú responsivo: provee un acceso flotante persistente e indicador de sesión que permite a los usuarios autenticados transicionar fluidamente entre el sitio público y el panel sin perder el contexto de su sesión.
- `api.js` hace las llamadas a `/api`, agrega el token y convierte los errores del servidor en `Error` con el mensaje que mostró la API. El token se guarda en `sessionStorage`, así que se pierde al cerrar la pestaña.
- El panel está en `pages/Admin*.jsx`. Los formularios y tablas reutilizables están en `components/` (por ejemplo `FormHorario`, `TablaMesas`, `FormIngreso`).
- Los controles de rol del cliente (`SoloAdministrador`, el menú `AdminLateral`) son solo de comodidad. El servidor valida el rol en cada ruta.

## 7. Gestión de errores y validaciones

**Códigos de respuesta.** La API devuelve siempre un JSON con el campo `error` y un mensaje en español que el panel muestra tal cual.

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos o campos obligatorios vacíos. |
| 401 | Sin sesión, token inválido o vencido, o usuario eliminado. En el login, credenciales incorrectas. |
| 403 | La sesión no tiene el rol que pide la ruta. |
| 404 | El recurso no existe, o una ruta `/api` que no existe. |
| 409 | Duplicado (por ejemplo, un correo ya registrado). |
| 413 | El pedido supera los 15 MB (fotos o contenido). |
| 429 | Demasiados intentos de login o de contacto. |
| 503 | La base no responde en Vercel o producción, no hay dónde guardar las fotos, o el correo no está configurado. |
| 500 | Error no previsto. Se registra en el servidor y el cliente recibe un mensaje genérico. |

**Validaciones de negocio** (se hacen en el servidor, en los servicios y rutas, y los modelos de Mongoose actúan como segundo control):
- Usuarios: nombre y correo obligatorios, formato de correo, rol válido, contraseña de al menos 8 caracteres con una mayúscula y un número, correo único. No se puede cambiar el propio rol ni eliminar el propio usuario, y siempre tiene que quedar al menos un administrador.
- Horarios: ciclo lectivo, cuatrimestre, año de la carrera, turno y horas con formato válido (`HH:MM`, 24 h). Docente y aula son opcionales.
- Mesas y llamados: nombre de llamado único sin distinguir mayúsculas ni espacios. Un llamado que se publicó alguna vez no se puede eliminar.
- Eventos: título y descripción obligatorios, fecha válida, hasta 20 fotos, tipos JPG, PNG o WebP, 4 MB por foto. Los enlaces a fotos solo pueden ser `http(s)` o rutas del propio sitio.
- Contenido institucional: cada sección tiene límites de cantidad y de largo (`LIMITES` en `services/contenido.js`). Con convocatoria de ingreso cargada, todas las etapas necesitan fecha de inicio.
- Contacto: nombre, correo y mensaje obligatorios, teléfono con formato válido si se completa, y motivo de una lista fija.

**Fallas de conexión.**
- Sin MongoDB en desarrollo, el servidor pasa a modo memoria y lo avisa por consola. En producción o en Vercel no lo hace: falla, para no guardar datos en un lugar donde se perderían.
- En Vercel, si la preparación falla, la función responde 503 y no guarda el fallo: reintenta en la petición siguiente.
- Instagram: la sincronización se realiza a demanda desde el panel administrativo (`POST /api/instagram/sync`). El token de larga duración tiene una vigencia de 60 días y se renueva manualmente actualizando `INSTAGRAM_TOKEN`. Si el servicio no está configurado o el token expira, el panel deshabilita la sincronización y el sitio público muestra un estado institucional vacío prolijo, permitiendo la carga y visualización manual de eventos sin fallas ni dependencias bloqueantes. Si una publicación de un lote no se puede descargar completa, queda pendiente y se reintenta en la sincronización siguiente mientras siga entre las últimas 20.

**En el cliente.** Las eliminaciones y los cambios que afectan al sitio piden confirmación en ventanas propias. Los formularios avisan si se intenta salir con cambios sin guardar. Si no se puede conectar con el servidor, `api.js` muestra «No se pudo conectar con el servidor. Probá de nuevo en unos minutos.».

## 8. Pruebas implementadas

Hay **516 pruebas automáticas, todas aprobadas**, en 39 archivos de `server/test/`. Usan `node:test` y supertest. Corren sobre los repositorios en memoria, así que no necesitan base de datos ni conexión a Internet. Se ejecutan con:

```bash
npm test
```

La corrida completa tarda desde unos 25 segundos hasta un par de minutos, según el equipo.

| Área | Archivos | Qué cubren |
|---|---|---|
| Acceso y usuarios | `auth`, `permisos`, `usuarios`, `passwords`, `seed`, `arranque`, `config` | Login, bloqueo por intentos, permisos por rol, reglas de contraseña, alta/edición/baja de usuarios, creación del primer administrador, elección de repositorios según el entorno. `permisos` recorre 45 rutas de la API como visitante, Bedelía y Administrador; la matriz está en [matriz-de-permisos.md](./matriz-de-permisos.md). |
| Horarios y archivado | `academica`, `publicacion`, `plan`, `archivo`, `alumnos`, `finalizados` | Alta, edición y baja de materias, reutilización, publicar y retirar, comparación de cambios, reglas de archivado por fecha en los bordes del calendario. |
| Mesas de examen | `mesas`, `mesas.panel`, `mesas.celular` | Llamados y mesas, publicación, retiro y reglas de eliminación. |
| Eventos | `eventos`, `eventos.formulario`, `eventos.edicion`, `eventos.fotos`, `eventos.galeria`, `eventos.sitio` | Alta, edición, mostrar y ocultar, galería, límites de fotos, lo que ve el sitio público. |
| Instagram | `instagram`, `instagram.bloque`, `instagram.sin-conexion`, `instagram.sincronizacion` | Interpretación de textos, sincronización, estados sin conexión. |
| Contenido institucional | `contenido`, `contenido.cliente`, `ingreso`, `ingreso.historial` | Validación de las cinco secciones y el historial de convocatorias. |
| Contacto y correo | `contacto`, `contacto.limite`, `correo.mensaje`, `correo.smtp` | Validación del formulario, límite de envíos, reparto entre casillas, envío por SMTP. |
| Otros | `admin.inicio`, `confirmaciones`, `enlaces`, `visor`, `salud` | Inicio del panel, confirmaciones, enlaces, visor de fotos, estado del servicio. |

Los casos de prueba y su relación con los requerimientos están en [plan-de-testing.md](./plan-de-testing.md). Las pruebas cubren el servidor y las funciones de apoyo del cliente que se ejecutan sin navegador (por ejemplo `client/src/academica.js` o `client/src/confirmaciones.js`). No hay pruebas automáticas de la interfaz dentro del navegador.

## 9. Decisiones de diseño

Cada decisión se tomó del código o de los acuerdos de arquitectura del equipo. Para una profundización formal bajo el estándar de la industria, consultar los [Registros de Decisiones de Arquitectura (ADRs)](./adr/README.md) (`ADR-001` a `ADR-007`).

**Publicar es un paso aparte de guardar (horarios y mesas).** Los datos de trabajo (`horarios`, `mesas_examen`) y lo que ven los alumnos (`publicaciones_horarios`, `llamados.publicacion`) son documentos distintos. Publicar o actualizar reemplaza la copia entera en una sola escritura, y así nunca se ve una mezcla de la versión anterior y la nueva. Retirar marca la copia como no publicada y la conserva. La razón de fondo es que Bedelía pueda preparar un período completo sin que se vea a medio cargar.

**El contenido institucional se publica al guardar.** Es una sección editable por vez, guardada entera. No usa copia aparte.

**Archivado calculado, no guardado.** Nada se borra ni se mueve: el servidor calcula al responder qué está vigente y qué pasó al archivo (`services/archivo.js`). Eventos: se ven los del año actual y el anterior. Horarios: los períodos publicados del año actual y el más reciente de todos los publicados. Mesas: un llamado pasa al archivo 30 días después de su fecha más tardía. Las acciones manuales tienen prioridad: un evento oculto sigue oculto aunque sea «visible siempre». Las fechas se comparan en el calendario de Argentina y no con la zona horaria del servidor, y «hoy» se recibe por parámetro para poder probar los límites. *(Nota de diseño y mejora registrada: en el código actual el archivado de eventos se calcula por antigüedad de fecha a dos años salvo `visibleSiempre`, pero por requerimiento de negocio institucional la regla definitiva acordada es que el archivado sea una acción manual y deliberada del administrador mediante el estado `archivado`, documentado como sub-issue de mejora en #81).*

**Repositorios intercambiables.** Permiten trabajar y probar sin base de datos en memoria. El costo es mantener dos implementaciones por entidad.

**Descarte de rol de superadministrador.** Se implementan exclusivamente los roles `admin` y `bedelia`, alineados con las indicaciones institucionales de las autoridades del instituto y evitando sobreingeniería o jerarquías redundantes.

**Persistencia de sesión y menú flotante.** Se incorpora el componente `SesionFlotante`, permitiendo que el personal administrativo navegue fluidamente por el portal público sin perder la visibilidad de su sesión activa ni tener que reautenticarse para retornar al panel de gestión.

**Sincronización a demanda de Instagram.** Se prioriza la ejecución supervisada desde el panel administrativo (`POST /api/instagram/sync`), sin tareas programadas automáticas de fondo, garantizando control sobre las publicaciones incorporadas y tolerancia absoluta si el token vence o falta conectividad.

**Límite de login por correo.** Se cuenta por correo y no por IP, porque la IP se puede falsear con el encabezado `X-Forwarded-For`.

**Validar en el servidor y también en el cliente.** El servidor es la autoridad: valida datos y roles aunque el cliente ya lo haga.

**Eventos sin baja destructiva.** El panel permite ocultar un evento pero no eliminarlo físicamente de la base. Es consistente con el alcance institucional de preservar el historial de actividades.

**Fotos fuera de la base.** Las fotos se suben a Cloudinary y en MongoDB queda solo el enlace. Las fotos quitadas desde el panel no se borran de Cloudinary: quedan registradas en `mediosQuitados`.

## 10. Qué hacer si algo falla

Cada ítem describe el comportamiento operativo del sistema ante incidentes:

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El sitio desplegado devuelve «El servicio no está disponible en este momento» | MongoDB Atlas no responde o `MONGODB_URI` es incorrecta. | Revisar el estado del clúster y la variable en Vercel. La API reintenta sola en la petición siguiente. |
| El servidor no arranca con «Falta MONGODB_URI» | Se ejecutó en producción sin la variable. | Definir `MONGODB_URI`. Solo en desarrollo se permite trabajar en modo memoria. |
| Nadie puede entrar al panel | No hay usuarios y faltan `SEED_ADMIN_MAIL` o `SEED_ADMIN_PASSWORD`; o se perdió la contraseña del único administrador. | Cargar las variables `SEED_ADMIN_*` provistas en `.env.example` y reiniciar con la colección `usuarios` vacía, o crear el usuario con `npm run seed:admin --prefix server`. |
| Un usuario queda bloqueado | 5 intentos fallidos de inicio de sesión. | Esperar 15 minutos. El bloqueo está en memoria: reiniciar el servidor local lo restablece de inmediato. |
| El formulario de contacto devuelve error | Faltan las variables de correo, hay solo una de las dos credenciales SMTP, o las casillas son iguales. | Revisar `SMTP_*`, `CORREO_BEDELIA` y `CORREO_INSTITUCIONAL` (apartado 5.4). |
| No se pueden subir fotos de eventos | Faltan las credenciales de Cloudinary en producción. | Cargar `CLOUDINARY_*` en las variables de entorno de Vercel. |
| «Sincronizar Instagram» está deshabilitado, o la sincronización termina con error | Faltan las credenciales o el token expiró (duración máxima de 60 días). | Renovar `INSTAGRAM_TOKEN` e `INSTAGRAM_ACCOUNT_ID` en las variables de entorno. Los eventos manuales continúan funcionando normalmente. |
| Los alumnos no ven un cambio | El cambio está guardado pero sin publicar. | En el panel, Información académica: seleccionar Publicar o Actualizar publicación. |
| Los PDF no se generan en Vercel | Faltan las fuentes de `pdfkit` en la función serverless. | Verificar la directiva `includeFiles` en `vercel.json`. |

### 10.1 Plan de contingencia y respaldos

1. **Copias de seguridad de datos:** MongoDB Atlas realiza respaldos continuos y programados de todas las colecciones. Ante cualquier incidente o alteración indebida de datos, el estado se puede restaurar puntualmente desde la consola de Atlas.
2. **Preservación de activos multimedia:** Las imágenes y fotografías institucionales residen en Cloudinary bajo el directorio `ifts2/`. Su persistencia no depende de los contenedores efímeros de Vercel ni del servidor local.
3. **Resiliencia de despliegues:** La infraestructura en Vercel genera despliegues inmutables por cada commit. Ante cualquier eventualidad técnica tras una actualización en `main`, es posible realizar un *Instant Rollback* a la versión previa en segundos desde el panel de control.
4. **Desacoplamiento de servicios:** El fallo temporal de servicios de terceros (Instagram Graph API, Cloudinary o servidores SMTP) no inhabilita la navegación pública, la consulta de horarios, el acceso a mesas de examen ni la operación de Bedelía.
