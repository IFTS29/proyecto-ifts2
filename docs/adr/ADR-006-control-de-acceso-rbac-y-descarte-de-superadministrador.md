# ADR-006: Control de acceso basado en roles (RBAC) y descarte de superadministrador

* **Estado:** Aceptado  
* **Fecha:** 2026-10-15  
* **Decisores:** Equipo 404-Solutions y Autoridades del IFTS N.° 2  
* **Relacionado con:** Issue `#42`, `#31 [US-02]`, `#109 [TK-02.4]`, `#38 [US-09]`

---

## 1. Contexto y Planteo del Problema

El panel de gestión requiere autenticación y autorización para restringir qué pantallas y operaciones puede ejecutar cada integrante del personal institucional.

Durante el diseño se debatió si incorporar una jerarquía de tres o más roles, incluyendo un rol de «Superadministrador» (con permisos especiales sobre los demás administradores y configuraciones internas), además de «Administrador» y «Bedelía».

---

## 2. Decisión Adoptada

Se decidió implementar un **modelo RBAC simplificado de dos roles** y **descartar formalmente el rol de superadministrador**:
* **Roles adoptados:**
  1. `admin` (Administrador): gestión integral de usuarios, eventos, contenido institucional, sincronización y acceso a la información académica.
  2. `bedelia` (Bedelía): limitado estrictamente a la carga, edición y publicación de horarios de cursada y mesas de examen.
* **Descarte de Superadministrador:** las autoridades del instituto indicaron que la estructura del IFTS N.° 2 no requiere jerarquías extraordinarias que añadan complejidad o barreras burocráticas; los administradores comparten la misma responsabilidad operativa.
* **Seguridad y validación en base de datos:** aunque el token JWT viaja en cada petición con el reclamo `rol`, el middleware `server/src/middleware/auth.js` consulta el documento del usuario en MongoDB en cada solicitud crítica. Esto garantiza que si un usuario es dado de baja o su rol es modificado, el cambio surte efecto inmediatamente sin esperar al vencimiento del token (8 horas).
* **Protección del último administrador:** el sistema impide que un administrador elimine su propia cuenta o modifique su propio rol si es el único administrador restante en la base de datos.

---

## 3. Consecuencias y Trade-offs

### Consecuencias Positivas
* **Alineación con el organigrama real:** el software refleja fielmente las necesidades y la cultura operativa del cliente sin sobreingeniería.
* **Seguridad robusta:** revocación inmediata de permisos y prevención de bloqueos accidentales del panel.
* **Matriz de permisos auditada:** respaldada por la prueba automatizada `server/test/permisos.test.js` que verifica 45 endpoints contra los roles definidos.

### Consecuencias Negativas / Compromisos Asumidos
* **Sin perfil de solo edición de contenidos:** los docentes o colaboradores que cargan eventos deben tener rol `admin`, o en su defecto esperar a la implementación de la historia de usuario futura `[US-12]` (Rol de Editor Institucional).
