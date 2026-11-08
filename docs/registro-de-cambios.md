# Registro de cambios hacia la Etapa 3

Acá se anota, en orden cronológico, qué se cambió en el proyecto y por qué. Cada entrada dice qué se hizo, en qué archivos, cómo se comprobó y qué quedó pendiente.

## 2026-10-16: migración del prototipo a React y estructura del servidor

**Punto de partida.** El prototipo era una página HTML con CSS y JavaScript sueltos (rama `separar-codigo-y-mejoras-reunion2` del repo de Mario), con los cambios pedidos en la 2.ª reunión con el IFTS 2 ya simulados: perfiles Administrador y Bedelía, pantalla de usuarios, descarga de archivados, login fuera del menú superior y límite de intentos. No tenía backend ni base de datos, y la sesión y los datos eran simulados en el navegador. El botón flotante "Pantallas del prototipo" se había quitado antes.

**Motivo.** La Etapa 2 define una arquitectura de tres capas (React, Node con Express, MongoDB con servicios externos). El prototipo no seguía esa arquitectura y la Etapa 3 pide una aplicación con base de datos y CRUD.

**Qué se hizo**
- Se movió el prototipo original a `prototipo-html/`, sin modificarlo, para tenerlo de referencia.
- Se creó `client/` con React 18, Vite y React Router. Las 14 pantallas del prototipo pasaron a un componente cada una en `client/src/pages/`. El HTML se convirtió con un script de una sola vez y después se ajustó a mano.
- Los estilos (`styles.css`) se copiaron sin cambios, salvo las rutas de las imágenes, que ahora apuntan a `/img/` (carpeta `public/`).
- El comportamiento que antes estaba en `js/app.js` se reescribió como código de React:
  - Menú móvil y encabezado fijo: `components/Header.jsx`.
  - Pestañas de Carrera y Alumnos, vista de eventos en grilla o lista, miniaturas del detalle de evento, carrusel del inicio, avisos de los formularios y descarga de la guía en PDF: dentro de cada página.
  - Login con límite de 5 intentos, alta y baja de usuarios con las mismas validaciones, y descarga de archivados: en `Login.jsx`, `AdminUsuarios.jsx` y `AdminEventos.jsx`.
- La sesión y el rol pasaron a un contexto de React (`context/AuthContext.jsx`). Se agregaron rutas protegidas: sin sesión, el panel redirige a `/login`; con el perfil Bedelía, Eventos, Contenido y Usuarios redirigen al inicio del panel.
- El menú lateral del panel, que estaba repetido en seis pantallas, quedó en un solo componente (`components/AdminLateral.jsx`).
- Los enlaces internos dejaron de usar `#/` y pasaron a rutas normales (`/carrera`, `/admin-eventos`, etc.). Se agregó `client/vercel.json` para que las rutas directas funcionen al desplegar.
- Se creó `server/` con Express: `app.js` (seguridad con helmet, CORS, ruta `/api/salud`, respuestas de error en JSON), `db.js` (conexión a MongoDB reutilizable, pensada para Vercel), `index.js` y `.env.example` con las variables previstas.
- Se escribió el `README.md` de la raíz con la arquitectura, cómo ejecutarlo y qué es simulado.

**Cómo se comprobó**
- Compilación con `vite build`, sin errores.
- Comparación de capturas contra el prototipo original: las 8 pantallas públicas y 5 de las 6 del panel salieron idénticas. La sexta (inicio del panel) difiere en un par de píxeles de un texto.
- 25 verificaciones de comportamiento en un navegador automatizado: redirecciones del panel, mensajes del login y bloqueo, menú de Bedelía, alta con correo repetido y contraseña débil, baja con confirmación, descargas, pestañas, vista lista, miniaturas, carrusel, menú móvil y enlace del pie a `/carrera#plan-estudios`. Todas dieron OK.
- 2 pruebas del servidor con `node --test` y supertest (`/api/salud` y ruta inexistente). Pasan.
- Todo se probó en un entorno de pruebas aparte, no en la compu de Raquel. Falta correr `npm install` y `npm run dev` en `client/` en la máquina local.

**Pendiente después de este cambio**
- La sesión, los roles, los usuarios, los eventos y los horarios siguen siendo datos del navegador o de ejemplo.
- No hay rutas de la API, modelos de MongoDB, subida de fotos a Cloudinary, correo del formulario ni integración con Instagram.
- No hay pruebas del cliente ni manuales (Etapa 3).

## 2026-10-16: login real, permisos por rol y CRUD de usuarios en el servidor

**Motivo.** Era el primer paso de la Etapa 3 sobre el servidor: reemplazar la sesión simulada del navegador por autenticación real (RF08, RNF04) y empezar con un CRUD completo que pudiera probarse de punta a punta.

**Qué se hizo en `server/`**
- Contraseñas guardadas con bcrypt (`services/passwords.js`). La regla es de 8 caracteres como mínimo, con letras y números.
- Login `POST /api/auth/login` que devuelve un token JWT de 8 horas, y `GET /api/auth/yo` para verificar la sesión. Si el correo no existe, se compara igual contra un hash de relleno para que la demora no delate si el correo está registrado.
- Bloqueo tras 5 intentos fallidos durante 15 minutos (`services/bloqueo.js`). Se cuenta por correo y no por IP, porque la IP se puede falsear con el encabezado `X-Forwarded-For` (se detectó probando y se corrigió antes de cerrar este cambio). El contador está en memoria: con varias instancias del servidor, cada una lleva su propia cuenta.
- Middleware `autenticar` (token válido y usuario existente: si se elimina un usuario, su token deja de servir) y `requiereRol`.
- CRUD de usuarios `GET/POST/DELETE /api/usuarios`, solo para el rol Administrador. Valida nombre y correo obligatorios, formato de correo, rol válido, contraseña, correo repetido (409, sin distinguir mayúsculas), que nadie se elimine a sí mismo y que quede al menos un administrador.
- Dos repositorios con la misma interfaz: `usuarios.memoria.js` (desarrollo y pruebas) y `usuarios.mongo.js` con su modelo `models/Usuario.js`. El servidor usa Mongo si existe `MONGODB_URI` y, si no, el modo memoria. En producción exige la base y `JWT_SECRET`.
- Creación del primer administrador al arrancar si no hay usuarios (`services/seed.js`), con los datos de `SEED_ADMIN_*`. En desarrollo hay valores por defecto (documentados en el README).
- Las dependencias se reciben por parámetro en `crearApp(...)`, lo que permite probar la lógica sin base de datos.

**Qué se hizo en `client/`**
- `src/api.js`: función `api()` que agrega el token y traduce los errores del servidor en mensajes.
- `AuthContext` ahora llama a la API (`login`, `logout`) y, al abrir la página, verifica el token guardado en `sessionStorage`. Las rutas protegidas esperan esa verificación antes de decidir.
- `Login.jsx`: se sacó el contador de intentos del navegador (ahora lo lleva el servidor) y los valores precargados del formulario del prototipo.
- `AdminUsuarios.jsx`: la tabla se carga desde la API y el alta y la baja la llaman. Los mensajes de error son los del servidor.

**Cómo se comprobó**
- 28 pruebas automáticas del servidor (`npm test`, con node:test y supertest, repositorio en memoria): validación de contraseñas, hash, bloqueo y su vencimiento, login (correcto, incorrecto, correo inexistente, mayúsculas, token alterado, bloqueo que no se saltea con otra IP), permisos por rol (403 para Bedelía), alta con hash, duplicados, datos inválidos, baja y pérdida de acceso del usuario eliminado.
- 14 verificaciones en un navegador automatizado con el servidor y el cliente corriendo juntos: login y bloqueo, sesión que sobrevive a la recarga, alta con duplicado y contraseña débil, Bedelía con menú restringido y 403 en la API, baja de un usuario y pérdida de su sesión.
- No se probó contra MongoDB: desde el entorno de pruebas no se pudo levantar una base. El código de `usuarios.mongo.js` y del modelo queda sin verificar hasta correrlo con una base real (Atlas o una local).

**Pendiente después de este cambio**
- Probar el servidor con MongoDB.
- Eventos, información académica y contenido institucional siguen como datos de ejemplo en el cliente y no tienen rutas en la API.
- Subida de fotos, correo del formulario, archivado, Instagram y despliegue.

## 2026-10-16: ajustes del login y los usuarios a los criterios de los issues

**Motivo.** Al leer los issues del repositorio del equipo (#29, #30, #31, #38) se vio que lo hecho en el cambio anterior no cumplía del todo sus criterios. Este cambio cierra las diferencias que eran de código. Trabajo hecho en la rama `feature/login-usuarios`, que sale de `develop` (ya con la migración a React mergeada).

**Qué se cambió**
- Regla de contraseña (issue #30): 8 caracteres como mínimo, con una mayúscula y un número. Antes pedía letras y números. Cambia en `services/passwords.js`, en el texto de ayuda de la pantalla y en las pruebas.
- Ruta de la API (issue #38): `/api/usuarios` pasó a `/api/users`, que es el nombre que usan los issues. Se actualizaron el servidor, el cliente y las pruebas. El registro de cambios anterior sigue nombrando la ruta vieja porque describe lo que se hizo en ese momento.
- Límite de intentos (issue #30, tarea TK-01.2): se reemplazó el contador hecho a mano (`services/bloqueo.js`) por `express-rate-limit` (`services/limitador.js`). Mantiene el comportamiento: 5 intentos fallidos por correo, bloqueo de 15 minutos, el login correcto borra los fallos anteriores, y se sigue contando por correo y no por IP. La cuenta sigue en memoria de cada instancia del servidor.
- Edición de usuarios (issue #38, tarea TK-09.1): nuevo `PUT /api/users/:id`. Acepta nombre, correo, rol y contraseña, todos opcionales; una contraseña vacía significa no cambiarla. Valida formato, correo repetido (409), que nadie se cambie el rol a sí mismo y que quede al menos un administrador. Se agregó `actualizar` a los dos repositorios (memoria y Mongo).
- Pantalla de usuarios (issue #38, tarea TK-09.2): botón Editar en cada fila. El mismo formulario pasa a modo edición, con "Guardar cambios" y "Cancelar", y el selector de rol queda bloqueado si la persona se edita a sí misma.

**Cómo se comprobó**
- 36 pruebas automáticas del servidor (`npm test`). Se quitaron las 3 del contador casero, se agregaron 2 de bloqueo (una cuenta no afecta a las otras, el login correcto borra los fallos) y 9 de edición. El vencimiento del bloqueo se prueba con una ventana corta de 300 ms.
- `vite build` del cliente sin errores.
- 13 verificaciones en un navegador automatizado con el servidor y el cliente corriendo juntos: alta rechazada por contraseña sin mayúscula, alta válida, modo edición con los datos cargados, cambio de nombre y rol reflejado en la tabla, correo repetido, cancelar, selector de rol bloqueado al editarse a uno mismo, cambio de contraseña y login con la nueva.

**Lo que sigue sin cumplir de los issues**
- #28: faltan `morgan`, TailwindCSS (hoy se reutiliza el CSS original), la separación en `controllers` y un script en la raíz que levante cliente y servidor juntos.
- #29: solo existe el modelo de usuarios. Faltan contenido, información académica y eventos, y el script `npm run seed`. No está probada la conexión contra Atlas.
- #30: el token se guarda en `sessionStorage`; el issue pide "almacenado de forma segura" y no se evaluaron alternativas. Los middlewares se llaman `autenticar` y `requiereRol`, no `verifyToken` y `requireRole`.
- #31: el control de rol solo se aplica a `/api/users`; `/api/events` y `/api/content` todavía no existen.
- Todo lo que depende de MongoDB sigue sin probarse contra una base real.


## 2026-10-22: formulario de contacto con envío real de correo y protección anti-spam (Issue #37)

**Motivo.** Cumplir con la historia de usuario US-08 (RF07) para que los visitantes puedan enviar consultas directamente desde el portal hacia las casillas oficiales de Bedelía o institucional, sin exponer credenciales en el cliente.

**Qué se hizo en `server/`**
- Servicio de correo modular con Nodemailer (`services/correo.smtp.js` y `services/correo.mensaje.js`) con soporte de envío simulado en desarrollo y pruebas.
- Endpoint `POST /api/contacto` con validación estricta de campos (nombre, correo con formato válido, motivo predefinido y mensaje).
- Protección anti-spam mediante campo trampa (*honeypot*) y limitador de velocidad por IP (`services/limitador.contacto.js`), compatible con Vercel (`x-real-ip`) y redes IPv6 agrupadas por `/64`.

**Qué se hizo en `client/`**
- Conexión del formulario en `Contacto.jsx` hacia la API, con manejo de estados de carga, mensajes de éxito y errores claros.

**Cómo se comprobó**
- 38 pruebas automatizadas añadidas en `server/test/contacto.test.js` cubriendo validaciones, límites de tasa, honeypot y fallback SMTP. Total acumulado: 81 pruebas en verde.

## 2026-10-24: integración de Instagram Graph API, carrusel responsivo y visor modal (Issues #62, #64, #39)

**Motivo.** Cumplir con la US-10 (RF13) y la UI-02 para reflejar automáticamente las publicaciones y eventos de Instagram en la página principal y galerías sin duplicar trabajo de carga editorial.

**Qué se hizo en `server/`**
- Cliente oficial de Meta Graph API v26.0 (`services/instagram/meta.js`) con soporte para imágenes (`IMAGE`), videos MP4 (`VIDEO`) y álbumes (`CAROUSEL_ALBUM`).
- Endpoints `GET /api/instagram/feed` (con filtro opcional `?category=eventos` o `novedades`) y `POST /api/instagram/sync` protegido estrictamente con JWT y rol `admin`.
- Parser editorial inteligente (`services/instagram/parser.js`) que delimita automáticamente títulos mediante emojis institucionales (💻, 🚀, 🎓, ✨, 🍽️) o saltos de línea, separando el encabezado del cuerpo y eliminando hashtags redundantes.
- Persistencia local y arquitectura Adapter en `services/media/` para alternar transparentemente entre almacenamiento local y Cloudinary.

**Qué se hizo en `client/`**
- `Inicio.jsx`: Carrusel adaptable con tarjetas normalizadas (`16/10`), scroll snap y controles de navegación. Si no hay publicaciones disponibles, activa automáticamente el fallback institucional con tarjetas fijas.
- `Eventos.jsx`: Galería pública con selector de vista (cuadrícula / lista).
- `Evento.jsx`: Vista detallada de publicación con banner institucional fotográfico, tira interactiva de miniaturas para álbumes y reproductor nativo con poster de respaldo para videos.
- Migración de estilos a unidades relativas (`rem`, `em`, `clamp()`) para máxima adaptabilidad mobile sin desbordes horizontales.

**Cómo se comprobó**
- 13 pruebas unitarias y de integración añadidas en `server/test/instagram.test.js` cubriendo casos borde defensivos (posts sin texto, captions de >2.000 caracteres, álbumes de múltiples medios, videos sin poster y deduplicación por ID).
- Total del servidor: **94 de 94 pruebas aprobadas (100% verde)** en 1.2 segundos.
- Compilación de producción con `vite build` en el cliente con 0 errores y 0 advertencias.

## 2026-10-25: CRUD de Eventos institucionales con galería de fotos (Issue #34 - US-05)

**Motivo.** Cumplir con la historia de usuario US-05 (RF11, RF05) para permitir que los administradores institucionales publiquen y gestionen eventos desde el panel con hasta 20 fotos y enlaces a publicaciones o videos de Instagram.

**Qué se hizo en `server/`**
- Repositorio y modelo de eventos (`repos/eventos.mongo.js` y `repos/eventos.memoria.js` con modelo `models/Evento.js`) soportando estados (`visible`, `oculto`, `para_revisar`, `archivado`, `descartado`) y orígenes (`manual`, `instagram`).
- Rutas REST `/api/events` públicas (`GET /` solo para visibles, `GET /:id`) y protegidas (`GET /admin` con conteos de moderación por estado, `POST /`, `PUT /:id`, `DELETE /:id`).
- Extracción de miniaturas Open Graph (`extraerFotoInstagram`) al cargar publicaciones de Instagram para asegurar imagen de portada cuando no se adjuntan fotos manuales.

**Qué se hizo en `client/`**
- Conexión del formulario `AdminEventoNuevo.jsx` con el endpoint de creación de eventos, validaciones y soporte para carga de archivos y enlaces.
- Conexión del panel `AdminEventos.jsx` con filtrado por pestañas de estado (`todos`, `para_revisar`, `visible`, `oculto`, `archivado`) y conteos dinámicos.
- Galería pública `Eventos.jsx` y vista de detalle `Evento.jsx` conectadas a la API institucional.

**Cómo se comprobó**
- 8 pruebas de integración agregadas en `server/test/eventos.test.js` cubriendo permisos por rol (Bedelía vs. Admin), validaciones y ciclo de vida.
- Total del servidor: **102 de 102 pruebas en verde**.
- Backlog actualizado para Sprint 3: Issue #69 (Pipeline de normalización/compresión de imágenes) e Issue #70 (Refinamiento de estilos de tarjetas).

## 2026-10-25: Información académica, horarios de cursada con PDF y ajustes de sincronización (Issue #33 - US-04, PR #77)

**Motivo.** Cumplir con la historia de usuario US-04 (RF09, RF10) para permitir que Bedelía cargue, edite, publique y descargue en PDF los horarios de cursada por ciclo lectivo y cuatrimestre, manteniendo separados los borradores de trabajo de la versión pública oficial, y estabilizar la persistencia y almacenamiento en Vercel Serverless.

**Qué se hizo en `server/`**
- Repositorios y modelos para horarios (`models/MateriaHorario.js`, `repos/academica.mongo.js`, `repos/academica.memoria.js`) y publicaciones oficiales (`models/PublicacionAcademica.js`, `repos/publicaciones.mongo.js`, `repos/publicaciones.memoria.js`).
- Rutas REST `/api/academic` públicas (`GET /horarios`, descarga `GET /horarios/pdf`) y de administración (`/periodos`, `/guardar`, `/publicar`, `/reutilizar`) protegidas con autenticación y permisos de rol.
- Generación de PDF institucional con PDFKit (`services/pdfHorarios.js`) e inclusión de tipografías en `vercel.json` para entornos serverless.
- Persistencia del estado y cursor de sincronización de Instagram en MongoDB (`models/InstagramSync.js`) y manejo de almacenamiento temporal en `/tmp` para prevenir errores de solo lectura (`EROFS`) en Vercel.

**Qué se hizo en `client/`**
- Pantalla de administración `AdminAcademica.jsx` con componentes modulares (`FormHorario.jsx`, `FormReutilizar.jsx`, `TablaHorarios.jsx`, `ResumenHorarios.jsx`) con detección de cambios no publicados.
- Página pública `Alumnos.jsx` (`HorariosPublicos.jsx`, `HorariosDeCursada.jsx`) consumiendo los horarios publicados vigentes y ofreciendo descarga de la grilla en PDF por turno.
- Integración en `client/src/academica.js` y `client/src/api.js`.

**Cómo se comprobó**
- Pruebas automáticas agregadas en `server/test/academica.test.js`, `arranque.test.js` y `config.test.js`.
- Verificación de empaquetado y compatibilidad de fuentes en Vercel (133 pruebas pasando).

## 2026-10-26 al 2026-10-27: Cloudinary, edición de eventos, visor modal y confirmaciones propias (PRs #79, #80, #82, #83, #85, #87)

**Motivo.** Completar el ciclo de vida de Eventos (Issue #81 / #69), optimizar imágenes para no saturar memoria en Vercel y eliminar ventanas nativas del navegador (Issue #84).

**Qué se hizo**
- **Cloudinary (`PR #80`):** Reducción de imágenes en cliente (máx. 1600 px) y subida a Cloudinary (`ifts2/eventos`), guardando solo URL e ID en la base de datos.
- **Edición y visibilidad de eventos (`PR #82` y `#83`):** Endpoints `PUT /api/events/:id` y `PATCH /api/events/:id/estado`. Pantalla `AdminEventoEditar.jsx` con edición de textos, fecha, fotos y elección de portada (`FotosEvento.jsx`).
- **Confirmaciones propias (`PR #85`):** Componente modal reutilizable que reemplaza los `window.confirm` genéricos con foco accesible y botón de cancelación predeterminado.
- **Visor ampliado de fotos (`PR #87`):** Componente `VisorFotos.jsx` para visualización completa de afiches y navegación entre fotografías sin recorte visual.

## 2026-10-31: Sincronización robusta de Instagram, datos reales del inicio y Mesas de Examen (PRs #88, #89, #90, #92, #93)

**Motivo.** Evitar duplicaciones en sincronización, reflejar métricas reales en el inicio del panel y completar la gestión integral de exámenes (Issue #33 / #63).

**Qué se hizo**
- **Sincronización (`PR #88`, `#89`, `#90`):** Deduplicación estricta en Cloudinary (`ifts2/instagram`), respuesta 503 controlada ante falta de credenciales y widget de estado fidedigno en el panel.
- **Inicio administrativo real (`PR #92`):** Métricas reales de eventos y horarios publicados; supresión de datos simulados y restricción estricta de vistas para Bedelía.
- **Mesas de examen (`PR #93`):** Carga, edición, publicación y retiro de llamados de examen; generación de PDF individual por llamado y vista pública en `Alumnos.jsx` (260 pruebas pasando).

## 2026-11-01 al 2026-11-03: Contenido institucional, Plan de Estudios, Ingreso y Archivado (PRs #95 al #108)

**Motivo.** Entregar las secciones fijas institucionales editables, el plan de estudios con validez oficial, la gestión de convocatorias de ingreso y la política de retención histórica (Issues #32, #35, #36).

**Qué se hizo**
- **Enlaces útiles (`PR #95`):** Centralización de accesos institucionales (SIU Guaraní, Moodle, Mi Argentina, Becas) en `enlaces.js`.
- **Contenido institucional (`PR #96`):** Edición de perfil de egresado, autoridades/tutoría y datos de contacto desde el panel con persistencia en BD.
- **Plan de estudios oficial (`PR #97`, `#98`, `#103`):** 37 materias, correlatividades, horas cátedra oficiales, visualización y descarga de PDFs de la Resolución N.° 1202/MEGC/2007.
- **Convocatoria de ingreso (`PR #100`, `#101`, `#102`, `#106`):** Panel para editar convocatorias, etapas, fechas y FAQs; visualización de convocatoria anterior como referencia e historial de convocatorias.
- **Archivado automático y celular (`PR #104`, `#105`, `#107`, `#108`):** Archivado de eventos, horarios y mesas según fecha de Argentina sin borrado físico; adaptación completa de mesas y horarios a formato ficha en pantallas móviles sin desborde horizontal (375 pruebas pasando).

## 2026-11-04 al 2026-11-08: permisos por rol, Instagram por enlace, textos, Alumnos y documentación de la entrega (PRs #66, #110 al #147)

**Motivo.** Cerrar la Etapa 3: comprobar los permisos de cada rol con pruebas, terminar la carga de eventos desde Instagram, unificar los textos del sitio, mejorar la página de Alumnos y dejar la documentación al día con el código (Issues #39, #40, #41, #42, #43, #60, #109).

**Qué se hizo en el código**
- **Matriz de permisos (`PR #114`):** `permisos.test.js` recorre todas las rutas de la API con y sin sesión, como Administración y como Bedelía (141 pruebas), y `docs/matriz-de-permisos.md` documenta el resultado (#109).
- **Panel (`PR #115`, `#117`):** las secciones de Contenido institucional pasan a un submenú del menú lateral; el subtítulo del menú muestra el rol; el sitio público avisa cuando hay una sesión iniciada (hoy, con el botón **Sesión**).
- **Instagram (`PR #133`, `#134`, `#135`):** alta de eventos con el enlace de una publicación (con la foto de vista previa o, si no se obtiene, la publicación incrustada); mejor título y descripción de los eventos sincronizados; sin eventos repetidos entre la carga con enlace y la sincronización (#39).
- **Textos (`PR #136`, `#137`):** textos del panel y del sitio con un criterio común (tono neutro, salvo los textos que presentan la carrera), controlado por una prueba (`textos.test.js`); aviso de Contacto y pie de página con la sesión iniciada.
- **Alumnos (`PR #144`, `#146`):** franjas alternadas (horarios, mesas, prácticas y enlaces útiles); cada llamado de mesas con la fecha de actualización en su encabezado y un solo botón de PDF; «Todos los años» agrupa por año, cada año en su propio grupo de la tabla con una fila de título; enlaces útiles en tres columnas con tarjetas blancas; filtro por año también en las mesas; en la computadora, las tablas tienen un alto máximo, se desplazan por dentro con el encabezado fijo y vuelven al principio al cambiar el filtro.

**Qué se hizo en la documentación**
- Plan de testing (`PR #66`, `#138`, `#147`), reporte de pruebas (`PR #111`, `#140`, `#147`) y validación visual de los CRUD (`PR #111`, `#119`) (#40, #41).
- Manual técnico (`PR #122`, `#132`, `#139`, `#147`), registros de decisiones de arquitectura ADR-001 a ADR-007 (`PR #130`) y documentación de MongoDB Atlas (`PR #121`, `#131`, `#145`), con las capturas de `llamados` y `mesas_examen` agregadas el 8/11 (#42, #127 a #129).
- Manual de usuario: panel de administración (`PR #112`, `#118`, `#141`) y sitio público (`PR #142`, `#144`, `#146`) (#43).
- README de la entrega final (`PR #116`, `#143`) (#60); limpieza de archivos, roadmap y `package-lock.json` (`PR #110`, `#120`); este registro de cambios, con la entrada del 4 al 8/11 (`PR #147`).

**Datos del sitio desplegado (8/11)**
- Se cargaron en la base del sitio desplegado, con las mismas rutas que usa el panel: los horarios del 1.er cuatrimestre 2026 (20 materias, de la planilla «Unificado» del instituto), un 2.º cuatrimestre 2026 simulado (19 materias del plan con el docente de cada una según las planillas de mesas de 2025) y el llamado simulado «Noviembre–Diciembre 2026» (37 mesas, con la estructura de la planilla de julio–agosto 2025).
- Se eliminaron dos materias de prueba del 2.º cuatrimestre y se retiraron dos llamados de prueba con nombre de materia («Introducción a la Gastronomía» y «Nutrición»). Los llamados siguen en el panel como retirados: el sistema no permite eliminar un llamado publicado.
- Los datos simulados no son información académica oficial: antes de anunciar el sitio, Bedelía los reemplaza desde el panel (Manual Técnico, 12.4).

**Cómo se comprobó**
- `npm test` sobre `develop` en `371c066` (con el PR #146 integrado): 548 pruebas en 41 archivos, 548 aprobadas.
- Los PR #133 a #137, #144 y #146 se revisaron además en el navegador, a 1280 px y en celular (390 px). Los PR #139 a #146 se compararon byte por byte con la versión aprobada.

**Pendiente después de este cambio**
- Baja de eventos (#81, solo se ocultan), papelera de Instagram (#65) y las tareas de traspaso del Manual Técnico (12.4).
