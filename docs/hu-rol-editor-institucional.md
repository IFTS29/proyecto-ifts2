# Historia de Usuario: Rol de Editor Institucional para Eventos y Contenidos

**Código:** `[US-12]`  
**Épica:** Seguridad, Autenticación y Control de Accesos (RBAC)  
**Estado:** `Backlog / Flujo Futuro (Post-MVP)`  
**Dependencias:** `#31 [US-02]` (Roles iniciales Admin y Bedelía), `#109 [TK-02.4]` (Matriz de permisos)  

---

## 1. Descripción de la Historia de Usuario

> **Como** Administrador del Portal Web Institucional del IFTS N.° 2,  
> **Quiero** contar con un rol de usuario intermedio denominado «Editor» (o «Comunicación / Profesor»),  
> **Para** delegar la carga de eventos, fotos, publicaciones de Instagram y contenidos informativos al personal docente o de difusión sin otorgarles privilegios de administración de cuentas de usuario ni acceso a la gestión académica de Bedelía.

---

## 2. Justificación y Contexto de Negocio

En el diseño original del MVP se establecieron dos perfiles operativos:
1. **Administrador (`admin`):** control absoluto del panel, incluyendo la creación y baja de usuarios, contenidos, eventos y configuración.
2. **Bedelía (`bedelia`):** acotado estrictamente a la confección y publicación de horarios de cursada y mesas de examen.

A medida que el instituto incorpora docentes o coordinadores de carrera para alimentar la agenda cultural, muestras gastronómicas y novedades institucionales, otorgar el rol `admin` representa un riesgo de seguridad (principio de menor privilegio), ya que tendrían permisos para eliminar administradores o alterar usuarios.

La incorporación del rol `editor` permite una segregación de funciones clara y jerárquica en tres niveles:

```text
  ┌──────────────────────────────────────────────────────────────┐
  │                 Administrador General (admin)                │
  │     Gestión de usuarios, auditoría y control de accesos      │
  └──────────────┬───────────────────────────────┬───────────────┘
                 │                               │
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌─────────────────────────────┐
  │   Editor / Prensa (editor)   │ │       Bedelía (bedelia)     │
  │  Eventos, fotos, Instagram   │ │  Horarios, aulas, llamados  │
  │   y contenido institucional  │ │     y mesas de examen       │
  └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 3. Matriz de Permisos del Rol Editor

### 3.1 Rutas de API del Servidor

| Área / Ruta | Método | Rol Editor | Detalle / Justificación |
|---|---|:---:|---|
| `/api/users/*` | Todos | **No (403)** | No puede listar, crear, editar ni borrar usuarios del sistema. |
| `/api/events` | `GET /admin`, `POST`, `PUT` | **Sí** | Alta y modificación de eventos con galería de fotos. |
| `/api/events/:id/estado` | `PATCH` | **Sí** | Ocultar o mostrar eventos en el portal público. |
| `/api/events/:id/visible-siempre` | `PATCH` | **Sí** | Fijar eventos destacados en la cartelera. |
| `/api/instagram/sync` | `POST` | **Sí** | Disparar la sincronización manual de publicaciones. |
| `/api/content/:clave` | `PUT` | **Sí** | Actualizar autoridades, perfil, contacto, ingreso y preguntas frecuentes. |
| `/api/content/ingreso/historial` | `GET` | **Sí** | Consultar convocatorias archivadas de ingreso. |
| `/api/academic/*` (Horarios y Mesas) | Todos | **No (403)** | Operatoria reservada exclusivamente a Bedelía y Administrador. |

### 3.2 Navegación en el Panel de Administración (Frontend)

* **Menú lateral (`AdminLateral.jsx`):** visualiza únicamente los accesos a **Inicio**, **Eventos** e **Información Institucional**. Se ocultan los enlaces a **Horarios**, **Mesas de examen** y **Usuarios**.
* **Protección de rutas (`RutasProtegidas.jsx`):** acceso permitido a `/admin`, `/admin-eventos`, `/admin-evento-nuevo`, `/admin-evento-editar` y `/admin-contenido`. Redirección automática si intenta ingresar a `/admin-usuarios`, `/admin-academica` o `/admin-mesas`.

---

## 4. Criterios de Aceptación (Gherkin)

### Escenario 1: Creación de un usuario con rol Editor
* **Dado** que un Administrador autenticado se encuentra en el formulario de gestión de usuarios (`/admin-usuarios`),
* **Cuando** selecciona la opción «Editor» en el selector de roles y guarda el nuevo usuario,
* **Entonces** el usuario se persiste con `rol: "editor"` en la colección `usuarios` de MongoDB.

### Escenario 2: Publicación de eventos por parte de un Editor
* **Dado** que un usuario con rol `editor` ha iniciado sesión en el panel,
* **Cuando** accede a `/admin-evento-nuevo`, completa los datos requeridos y envía el formulario,
* **Entonces** la API responde con código `201 Created` y el evento queda disponible en la cartelera.

### Escenario 3: Bloqueo preventivo de acceso a la gestión de usuarios
* **Dado** un usuario autenticado con rol `editor`,
* **Cuando** intenta realizar una petición `GET` o `POST` hacia `/api/users`,
* **Entonces** el servidor intercepta la solicitud y responde con código HTTP `403 Forbidden` (`{"error": "Acceso denegado: se requiere rol de administrador"}`).

### Escenario 4: Bloqueo de acceso a la información académica
* **Dado** un usuario autenticado con rol `editor`,
* **Cuando** intenta modificar horarios (`POST /api/academic/horarios`) o mesas (`POST /api/academic/mesas`),
* **Entonces** el servidor responde con código HTTP `403 Forbidden`.

---

## 5. Tareas Técnicas Sugeridas (Desglose de Implementación)

- [ ] **TK-12.1 (Modelo y Validación de Usuarios en Backend):**
  - Actualizar el enumerador de roles en `server/src/models/Usuario.js` a `["admin", "bedelia", "editor"]`.
  - Adaptar las validaciones de negocio en `server/src/routes/usuarios.js` y `server/src/services/passwords.js`.
- [ ] **TK-12.2 (Control de Acceso en Rutas de Servidor):**
  - Actualizar middlewares en `server/src/routes/events.js`, `server/src/routes/instagram.js` y `server/src/routes/content.js` para autorizar a `requiereRol("admin", "editor")`.
  - Asegurar que `server/src/routes/usuarios.js` conserve exclusivamente `requiereRol("admin")`.
- [ ] **TK-12.3 (Interfaz de Usuario en React):**
  - Incorporar la opción «Editor (Eventos y Contenidos)» en el formulario `client/src/pages/AdminUsuarios.jsx`.
  - Adaptar `client/src/components/AdminLateral.jsx` para condicionar las opciones del menú según `usuario.rol === "editor"`.
  - Crear el componente contenedor `SoloDifusion` en `client/src/components/RutasProtegidas.jsx` permitiendo acceso a `admin` y `editor`.
- [ ] **TK-12.4 (Documentación y Pruebas Automatizadas):**
  - Actualizar la matriz de permisos en `docs/matriz-de-permisos.md` y [Manual de Usuario](file:///c:/Proyectos/IFTS29/proyecto-ifts2/docs/manual-de-usuario.md).
  - Agregar casos de prueba en `server/test/permisos.test.js` y `server/test/usuarios.test.js` validando los accesos permitidos y las restricciones del nuevo rol.
