# Matriz de permisos por rol

Este documento reúne quién puede hacer qué en el portal: en la API del servidor, en las rutas del cliente y en las pantallas del panel. Es la base de la auditoría de roles (#109, sub-issue de #31). La matriz de la API está comprobada por una prueba automática, `server/test/permisos.test.js`. Si se agrega o se cambia una ruta, hay que actualizar esa prueba y este documento.

## Roles

| Rol | Valor guardado | Quién es |
|---|---|---|
| Visitante | (sin sesión) | Cualquier persona que entra al sitio público. |
| Bedelía | `bedelia` | Personal que carga horarios y mesas de examen. |
| Administrador | `admin` | Quien administra el sitio completo, incluidos los usuarios. |

El rol está guardado en cada usuario (colección `usuarios`). El token de sesión lleva el identificador del usuario y su rol, pero el servidor **no usa el rol del token**: en cada pedido busca al usuario y toma el rol que tiene guardado (`server/src/middleware/auth.js`). Por eso un cambio de rol, o la eliminación de una cuenta, rige de inmediato aunque el token no haya vencido.

## API del servidor

Todas las rutas empiezan con `/api`. «Sí» significa que el permiso no frena el pedido. «No (401)» es la respuesta cuando no hay sesión y «No (403)», cuando la sesión no tiene el rol que pide la ruta.

### Rutas públicas

| Ruta | Visitante | Bedelía | Administrador |
|---|---|---|---|
| `GET /salud` | Sí | Sí | Sí |
| `POST /auth/login` | Sí | Sí | Sí |
| `POST /contact` (con límite de envíos) | Sí | Sí | Sí |
| `GET /events`, `GET /events/:id` (solo eventos visibles y no archivados) | Sí | Sí | Sí |
| `GET /academic/vigente`, `GET /academic/vigente/horarios.pdf`, `GET /academic/vigente/mesas.pdf` (solo lo publicado) | Sí | Sí | Sí |
| `GET /content` | Sí | Sí | Sí |
| `GET /instagram/status`, `GET /instagram/feed` | Sí | Sí | Sí |

### Rutas que piden sesión

| Ruta | Visitante | Bedelía | Administrador |
|---|---|---|---|
| `GET /auth/yo` | No (401) | Sí | Sí |

### Rutas de Administrador y Bedelía

| Ruta | Visitante | Bedelía | Administrador |
|---|---|---|---|
| `GET /academic/periodos`, `GET /academic/periodos/:periodo` | No (401) | Sí | Sí |
| `POST /academic/horarios`, `PUT /academic/horarios/:id`, `DELETE /academic/horarios/:id` | No (401) | Sí | Sí |
| `POST /academic/periodos/:periodo/reutilizar`, `.../publicar`, `.../retirar` | No (401) | Sí | Sí |
| `GET /academic/periodos/:periodo/vista-previa.pdf` | No (401) | Sí | Sí |
| `GET /academic/llamados`, `POST /academic/llamados`, `GET`, `PUT` y `DELETE /academic/llamados/:id` | No (401) | Sí | Sí |
| `POST /academic/llamados/:id/mesas`, `PUT` y `DELETE /academic/mesas/:id` | No (401) | Sí | Sí |
| `POST /academic/llamados/:id/publicar`, `.../retirar`, `GET .../vista-previa.pdf` | No (401) | Sí | Sí |

### Rutas solo de Administrador

| Ruta | Visitante | Bedelía | Administrador |
|---|---|---|---|
| `GET`, `POST /users`, `PUT` y `DELETE /users/:id` | No (401) | No (403) | Sí |
| `GET /events/admin`, `GET /events/admin/:id` | No (401) | No (403) | Sí |
| `POST /events`, `PUT /events/:id` | No (401) | No (403) | Sí |
| `PATCH /events/:id/estado`, `PATCH /events/:id/visible-siempre` | No (401) | No (403) | Sí |
| `POST /instagram/sync` | No (401) | No (403) | Sí |
| `PUT /content/:clave` | No (401) | No (403) | Sí |
| `GET /content/ingreso/historial` | No (401) | No (403) | Sí |

No existe ninguna ruta para eliminar un evento (issue #81).

## Rutas del cliente (React)

El cliente decide qué pantalla mostrar, pero **no es la barrera de seguridad**: el servidor valida el rol en cada pedido. Los controles del cliente evitan mostrar pantallas que después no van a funcionar.

| Ruta | Visitante | Bedelía | Administrador |
|---|---|---|---|
| `/`, `/carrera`, `/ingreso`, `/alumnos`, `/eventos`, `/evento`, `/contacto` | Ve la página | Ve la página | Ve la página |
| `/login` | Ve la página | Ve la página | Ve la página |
| `/admin` (inicio del panel) | Va a `/login` | Ve la página | Ve la página |
| `/admin-academica`, `/admin-mesas` | Va a `/login` | Ve la página | Ve la página |
| `/admin-eventos`, `/admin-evento-nuevo`, `/admin-evento-editar` | Va a `/login` | Vuelve a `/admin` | Ve la página |
| `/admin-contenido` | Va a `/login` | Vuelve a `/admin` | Ve la página |
| `/admin-usuarios` | Va a `/login` | Vuelve a `/admin` | Ve la página |
| Cualquier otra dirección | Va a `/` | Va a `/` | Va a `/` |

Lo resuelven `SoloAutenticados` y `SoloAdministrador` (`client/src/components/RutasProtegidas.jsx`), declarados en `client/src/App.jsx`. Mientras se verifica el token con el servidor (`GET /auth/yo`), el panel no muestra nada. Si el token ya no vale, se descarta y se vuelve a `/login`. El token se guarda en `sessionStorage`, de modo que se pierde al cerrar la pestaña.

## Pantallas del panel

### Menú lateral (`AdminLateral.jsx`)

| Opción | Bedelía | Administrador |
|---|---|---|
| Inicio | Sí | Sí |
| Eventos | No se muestra | Sí |
| Información académica | Sí | Sí |
| Contenido institucional | No se muestra | Sí |
| Usuarios | No se muestra | Sí |
| Ver el sitio, Cerrar sesión | Sí | Sí |

### Inicio del panel (`AdminInicio.jsx`)

| Elemento | Bedelía | Administrador |
|---|---|---|
| Acceso directo «Cargar un evento» | No se muestra | Sí |
| Acceso directo «Información académica» | Sí | Sí |
| Acceso directo «Eventos e Instagram» | No se muestra | Sí |
| Tarjeta «Eventos visibles» | No se muestra | Sí |
| Tarjetas «Horarios publicados» y «Llamados publicados» | Sí | Sí |
| Actividad reciente | Solo horarios y llamados publicados | Eventos cargados, horarios y llamados publicados |

Bedelía no consulta `GET /events/admin`, porque el servidor se lo negaría (403). Por eso, para Bedelía, la actividad reciente no incluye eventos.

### Usuarios (`AdminUsuarios.jsx`)

Solo la ve el Administrador. Además del rol, el servidor aplica estas reglas a las cuentas, sin importar quién las pida (`server/src/routes/usuarios.js`):

- Nadie puede cambiar su propio rol ni eliminar su propia cuenta.
- Siempre tiene que quedar al menos un administrador: no se puede eliminar ni cambiar a Bedelía al último.
- El rol solo puede ser `admin` o `bedelia`.
- Los hashes de contraseña nunca salen en las respuestas de la API.

## Cómo se comprobó

**Prueba automática.** `server/test/permisos.test.js` recorre 45 rutas de la API con tres visitantes (sin sesión, Bedelía y Administrador) y comprueba que el servidor rechace o deje pasar según la tabla de arriba. Para las rutas permitidas verifica que la respuesta no sea 401 ni 403: puede ser 400 o 404 según los datos, porque lo que se prueba es el permiso, no la operación. Los pedidos usan cuerpos vacíos e identificadores inexistentes, así que no se guarda nada. El inicio de sesión (`POST /auth/login`) no está en la prueba porque lo cubre `server/test/auth.test.js`. Una primera prueba comprueba que ninguna ruta de la tabla sea inexistente.

Además comprueba cinco situaciones de seguridad:

1. Un token firmado con otra clave no da acceso.
2. Un token vencido no da acceso.
3. Un token que dice `admin` pero pertenece a un usuario con rol `bedelia` no da acceso de administrador: se toma el rol guardado.
4. Un usuario eliminado pierde el acceso con el mismo token.
5. Si se cambia el rol de un usuario, el cambio rige de inmediato con el mismo token.

La prueba se verificó también en sentido contrario: al dar a Bedelía acceso a `/users` en el servidor, fallaron 6 pruebas: las 4 de esa ruta con Bedelía y 2 de las de seguridad.

**Pantallas.** No hay pruebas automáticas dentro del navegador. Las redirecciones y el menú de Bedelía se comprobaron en el navegador durante la validación visual del #41, con capturas del menú, de las tres redirecciones a `/admin` y del acceso a Información académica y Mesas de examen. Las lógicas del inicio del panel que dependen del rol (`datosDelInicio` y `actividadReciente`) tienen pruebas en `server/test/admin.inicio.test.js`.

## Puntos a confirmar por el equipo

1. **`GET /instagram/status` es público.** Devuelve la cuenta conectada, la fecha de la última sincronización y, si falló, el texto del error (`error`). El panel lo usa, pero la ruta no pide sesión. El feed público (`/instagram/feed`) sí es público a propósito. ¿Conviene pedir sesión de Administrador para `/status`, o dejar público solo si está conectado?
2. **Bedelía y las rutas de Información académica.** Bedelía puede eliminar horarios, mesas y llamados que nunca se publicaron, y publicar y retirar períodos. Si el instituto quiere que Bedelía cargue pero no publique, la regla no existe hoy.
3. **Bedelía y los eventos.** Bedelía no ve eventos en ningún lado del panel. Si más adelante necesita cargarlos, hay que cambiar la ruta del cliente y `soloAdmin` en el servidor.
4. **Cierre de sesión.** El token no se invalida en el servidor al cerrar sesión: simplemente el cliente lo descarta, y vale hasta vencer (8 horas por defecto, `JWT_DURACION`). Eliminar el usuario sí lo invalida de inmediato.
