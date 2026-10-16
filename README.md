# Portal web IFTS N.° 2

Proyecto de 404-Solutions para la Práctica Profesionalizante IV (IFTS N.° 29). Reemplaza el Google Site del IFTS N.° 2 por un sitio público y un panel de administración.

El proyecto sigue la arquitectura de tres capas definida en la Etapa 2 (sección 5.7):

| Capa | Tecnología | Carpeta | Estado |
|---|---|---|---|
| Presentación | React (Vite) y React Router | `client/` | Prototipo migrado; login y usuarios conectados a la API, el resto con datos simulados |
| Lógica | Node.js y Express | `server/` | Login con JWT, permisos por rol y CRUD de usuarios; faltan eventos, información académica, contenido, contacto e Instagram |
| Datos y servicios | MongoDB Atlas, Cloudinary, API de Instagram, correo de Bedelía | | Sin conectar |

El prototipo original en HTML, CSS y JavaScript quedó en `prototipo-html/` como referencia.

## Qué trae la rama feature/login-usuarios

Esta rama sale de `develop` (con la migración a React ya mergeada) y agrega la autenticación real y la gestión de usuarios. Es la primera parte del servidor que deja de ser un esqueleto.

- Login con contraseñas guardadas con bcrypt y token JWT de 8 horas. Tras 5 intentos fallidos con el mismo correo se bloquea esa cuenta durante 15 minutos (`express-rate-limit`).
- Dos roles, `admin` y `bedelia`. La API le responde 403 a Bedelía en la gestión de usuarios, y en el cliente las pantallas de eventos, contenido y usuarios solo las abre el administrador.
- Gestión de usuarios en el panel: listar, agregar, editar y eliminar. El servidor valida que el nombre y el correo estén completos, que el correo tenga formato válido y no esté repetido, que la contraseña tenga 8 caracteres con una mayúscula y un número, que nadie se elimine ni se cambie el rol a sí mismo, y que quede al menos un administrador.
- El cliente guarda el token en `sessionStorage` y lo verifica con `/api/auth/yo` al abrir la página.
- Hay un repositorio en memoria (desarrollo y pruebas) y otro con MongoDB. El de MongoDB todavía no se probó contra una base real.
- 36 pruebas del servidor (`npm test` en `server/`).

Rutas de la API que agrega:

| Ruta | Quién | Qué hace |
|---|---|---|
| `GET /api/salud` | Público | Estado del servidor |
| `POST /api/auth/login` | Público | Devuelve el token y el usuario |
| `GET /api/auth/yo` | Con sesión | Devuelve el usuario de la sesión |
| `GET /api/users` | Administrador | Lista los usuarios |
| `POST /api/users` | Administrador | Crea un usuario |
| `PUT /api/users/:id` | Administrador | Edita nombre, correo, rol o contraseña |
| `DELETE /api/users/:id` | Administrador | Elimina un usuario |

Estado de los issues relacionados:

- #38 (gestión de usuarios y roles): cubierto. El alta y la edición están en un formulario de la misma pantalla, no en un modal.
- #30 (login seguro): cubierto, con tres diferencias. El token está en `sessionStorage`, los middlewares se llaman `autenticar` y `requiereRol` en vez de `verifyToken` y `requireRole`, y tanto el administrador como Bedelía entran a `/admin` (el panel cambia según el rol).
- #31 (roles validados en el servidor): parcial. El control de rol existe, pero hoy solo protege `/api/users`, porque `/api/events` y `/api/content` todavía no existen.
- #29 (modelo de datos y seed): parcial. Solo está el modelo de usuarios y el administrador inicial; faltan los demás modelos y el script `npm run seed`.

El detalle de cada cambio y cómo se verificó está en `docs/registro-de-cambios.md`.

## Cómo ejecutarlo

Requiere Node.js 20 o superior.

```
cd client
npm install
npm run dev
```

Se abre en http://localhost:5173. El panel necesita el servidor corriendo:

```
cd server
npm install
npm run dev
```

El servidor escucha en el puerto 4000 y el cliente le reenvía las llamadas a `/api` (ver `client/vite.config.js`). Sin `MONGODB_URI` el servidor arranca en modo memoria: los datos se pierden al reiniciarlo, pero sirve para desarrollar. En ese modo crea un administrador inicial:

- Correo: `matias.pelaez@ifts2.edu.ar`
- Contraseña: `Cambiar1234`

Estos valores son solo para desarrollo. En producción hay que definir `MONGODB_URI`, `JWT_SECRET`, `SEED_ADMIN_MAIL` y `SEED_ADMIN_PASSWORD` (ver `server/.env.example`). Para entrar como Bedelía, crear antes ese usuario desde Usuarios.

Pruebas del servidor:

```
cd server
npm test
```

## Estructura

```
client/
  public/            imágenes (img/) y guía de preingreso (docs/)
  src/
    pages/           una pantalla por archivo (sitio público y panel)
    components/      Header, Footer, AdminLateral, Layout, rutas protegidas
    context/         AuthContext: sesión y rol
    api.js           llamadas a la API con el token de sesión
    styles.css       estilos del prototipo, sin cambios
server/
  src/               app de Express: rutas, middleware, servicios, repositorios y modelo de Mongo
  test/              pruebas con node:test y supertest
prototipo-html/      versión original en HTML puro
```

## Qué es real y qué es simulado

Funciona de verdad contra el servidor:

- Inicio de sesión con contraseñas guardadas con bcrypt y token JWT de 8 horas.
- Bloqueo de 15 minutos tras 5 intentos fallidos, contado por correo (con `express-rate-limit`).
- Permisos por rol validados en la API: Bedelía recibe 403 en la gestión de usuarios, y las rutas del panel también están protegidas en el cliente.
- Alta, edición y baja de usuarios (`GET/POST/PUT/DELETE /api/users`), con validación de campos, correo repetido y contraseña (8 caracteres como mínimo, con una mayúscula y un número).

Sigue simulado o sin conectar:

- Eventos, información académica, contenido institucional y descarga de archivados: datos de ejemplo en el cliente.
- Subida de fotos, formulario de contacto e integración con Instagram.
- Con la base MongoDB: el código existe (`server/src/repos/usuarios.mongo.js`) pero todavía no se probó contra una base real; las pruebas usan el repositorio en memoria.

## Lo que falta para cumplir la arquitectura

1. Probar el servidor contra MongoDB Atlas y crear el administrador inicial en producción.
2. Rutas de la API y modelos para eventos, información académica y contenido institucional (CRUD con validaciones).
3. Subida de fotos a Cloudinary, con compresión y máximo de 20 por evento.
4. Archivado automático y descarga de lo archivado.
5. Formulario de contacto con envío real de correo y reCAPTCHA.
6. Integración con Instagram (Graph API, hashtag acordado, renovación del token con tarea programada).
7. Reemplazar los datos fijos de `client/src/pages/` por llamadas a la API.
8. Despliegue en Vercel con variables de entorno.
9. Pruebas del cliente, manual técnico y manual de usuario (Etapa 3).
