# Registros de Decisiones de Arquitectura (ADR)

Este directorio reúne los **Architectural Decision Records (ADR)** del proyecto **Portal Web Institucional IFTS N.° 2**, desarrollado por el equipo **404-Solutions** en el marco de Prácticas Profesionalizantes IV (IFTS N.° 29).

Cada ADR documenta una decisión técnica o de diseño fundamental, el contexto y las restricciones en las que se tomó, y las consecuencias (beneficios y compensaciones asumidas) derivadas de su adopción.

---

## Índice de Decisiones de Arquitectura

| Código | Título | Estado | Fecha de Adopción | Componentes Afectados |
| :--- | :--- | :---: | :---: | :--- |
| [ADR-001](https://github.com/IFTS29/proyecto-ifts2/blob/develop/docs/adr/ADR-001-arquitectura-serverless-desacoplada.md) | Arquitectura Serverless desacoplada en Vercel | **Aceptado** | 2026-10-10 | `vercel.json`, `server.js`, `api/index.js` |
| [ADR-002](https://github.com/IFTS29/proyecto-ifts2/blob/develop/docs/adr/ADR-002-repositorios-intercambiables-e-inyeccion-de-dependencias.md) | Repositorios intercambiables e inyección de dependencias en `crearApp` | **Aceptado** | 2026-10-12 | `server/src/app.js`, `server/src/repos/`, `server/test/` |
| [ADR-003](https://github.com/IFTS29/proyecto-ifts2/blob/develop/docs/adr/ADR-003-generacion-de-pdfs-on-the-fly-en-memoria.md) | Generación de PDFs dinámicos «al vuelo» en memoria con PDFKit | **Aceptado** | 2026-10-25 | `server/src/services/academica.pdf.js`, `server/src/routes/pdf.js` |
| [ADR-004](https://github.com/IFTS29/proyecto-ifts2/blob/develop/docs/adr/ADR-004-separacion-de-datos-de-trabajo-y-publicados.md) | Separación estricta entre datos de trabajo y datos publicados | **Aceptado** | 2026-10-22 | `server/src/models/`, `server/src/services/academica.js` |
| [ADR-005](https://github.com/IFTS29/proyecto-ifts2/blob/develop/docs/adr/ADR-005-almacenamiento-multimedia-hibrido-con-cloudinary.md) | Almacenamiento multimedia persistente desacoplado en Cloudinary | **Aceptado** | 2026-10-26 | `server/src/services/media/`, `server/src/models/Evento.js` |
| [ADR-006](https://github.com/IFTS29/proyecto-ifts2/blob/develop/docs/adr/ADR-006-control-de-acceso-rbac-y-descarte-de-superadministrador.md) | Control de acceso basado en roles (RBAC) y descarte de superadministrador | **Aceptado** | 2026-10-15 | `server/src/middleware/auth.js`, `client/src/context/AuthContext.jsx` |
| [ADR-007](https://github.com/IFTS29/proyecto-ifts2/blob/develop/docs/adr/ADR-007-sincronizacion-a-demanda-de-instagram-graph-api.md) | Sincronización a demanda de Instagram Graph API con fallback manual | **Aceptado** | 2026-10-27 | `server/src/services/instagram/`, `client/src/pages/AdminEventos.jsx` |

---

## Formato de los Registros

La estructura de cada documento sigue el estándar formal de la industria (basado en el formato Michael Nygard y MADR):
* **Título y Código:** identificador numérico secuencial.
* **Estado:** Propuesto / Aceptado / Superado / Rechazado.
* **Contexto:** problema a resolver, limitaciones del entorno y alternativas evaluadas.
* **Decisión:** la opción arquitectónica adoptada y su fundamentación técnica.
* **Consecuencias:** balance de ventajas obtenidas y trade-offs o compromisos técnicos asumidos.
* **Referencias:** vinculación con issues del proyecto, código fuente y documentación técnica.
