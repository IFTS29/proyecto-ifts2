# Estado del Proyecto, Reorganización de Issues y Roadmap al 08/11/2026

**Equipo:** 404-Solutions (IFTS N.° 29 · Prácticas Profesionalizantes IV)  
**Proyecto:** Portal Web Institucional y Panel de Administración — IFTS N.° 2  
**Fecha de corte:** 04/11/2026  
**Fecha límite de entrega (Cierre de Sprint):** **08/11/2026**  
**Estado de la suite de pruebas:** **375 de 375 pruebas automáticas aprobadas (100% verde)**

---

## 1. Resumen Ejecutivo de la Situación Actual

El desarrollo técnico central del MVP **está completado en un 95%** gracias a los últimos pull requests mergeados a `develop` (PRs #53 al #108).
El backend cuenta con arquitectura modular, 375 pruebas automáticas, seguridad JWT y roles, persistencia en MongoDB Atlas y adaptadores resilientes para Cloudinary e Instagram. El frontend React es 100% responsive, con soporte mobile probado para todas las tablas y pantallas.

El desfasaje principal no es de código sino de **gestión y documentación**: muchas issues quedaron con estado `OPEN` en GitHub porque contenían notas de validación preventiva o requerimientos accesorios que no bloquean la entrega académica del MVP.

> [!WARNING] **Lección Aprendida / Desvío Metodológico en la Gestión de Issues (Post-Mortem):**
> Al inicio del Sprint 1, las Tareas Técnicas (TKs) se estructuraron como simples casillas de verificación (`- [ ]`) dentro del cuerpo markdown de cada Historia de Usuario (US) en lugar de crearse como issues/sub-issues independientes en GitHub Projects.
> Esto generó tres problemas operativos:
>
> 1. **Falta de visibilidad:** No se podía mover el progreso técnico de forma granular en el tablero Kanban asignando tareas individuales a cada integrante (Frontend, Backend, QA).
> 2. **Cierres prematuros y bugs artificiales:** Al mergear un PR parcial y cerrar una US (como ocurrió en `#34`), las tareas restantes (edición y baja) tuvieron que gestionarse abriendo issues nuevas caratuladas erróneamente como bugs (ej. `#81 [BUG-03]`), cuando en realidad eran tareas pendientes de desarrollo.
> 3. **Desincronización visual:** Funcionalidades 100% terminadas en código (como el archivado de `#35`) figuraban con `0/3` casilleros tildados porque nadie editaba el markdown de la issue padre tras mergear los PRs.
> Se deja asentado este desvío para la memoria técnica y retrospectiva del equipo.

---

## 2. Reorganización del Tablero de GitHub (Corte al 08/11)

### A. Issues que figuran CERRADAS en GitHub

Se conservan los enlaces directos a las historias y tareas ya cerradas en el repositorio:

- [#28 `[SETUP-01]` Estructura base del monorepo](https://github.com/IFTS29/proyecto-ifts2/issues/28) (Sprint 1)
- [#29 `[SETUP-02]` Modelo de datos y conexión inicial](https://github.com/IFTS29/proyecto-ifts2/issues/29) (Sprint 1)
- [#31 `[US-02]` Control de acceso y roles validados en servidor: Administrador y Bedelía](https://github.com/IFTS29/proyecto-ifts2/issues/31) (Sprint 1)
- [#33 `[US-04]` CRUD de Información Académica: horarios, aulas y mesas](https://github.com/IFTS29/proyecto-ifts2/issues/33) (Sprint 2)
- [#34 `[US-05]` CRUD de Eventos institucionales con galería de fotos](https://github.com/IFTS29/proyecto-ifts2/issues/34) (Sprint 2)
- [#38 `[US-09]` Gestión de usuarios del panel y asignación de roles](https://github.com/IFTS29/proyecto-ifts2/issues/38) (Sprint 2)
- [#49 `[DONE-01]` Definición de stack tecnológico de 3 capas](https://github.com/IFTS29/proyecto-ifts2/issues/49) (Sprint 1)
- [#50 `[DONE-02]` Acceso al login fuera del menú superior](https://github.com/IFTS29/proyecto-ifts2/issues/50) (Sprint 1)
- [#51 `[DONE-03]` Restricción de intentos fallidos en login](https://github.com/IFTS29/proyecto-ifts2/issues/51) (Sprint 1)
- [#52 `[DONE-04]` Perfiles simulados de Administrador y Bedelía](https://github.com/IFTS29/proyecto-ifts2/issues/52) (Sprint 1)
- [#55 `[SPIKE-01]` PoC de integración con Instagram Graph API](https://github.com/IFTS29/proyecto-ifts2/issues/55) (Sprint 1)
- [#56 `[BUG-01]` Creación del admin inicial en entorno local](https://github.com/IFTS29/proyecto-ifts2/issues/56)
- [#62 `[UI-02]` Componente de Carrusel Adaptable y Modal Visor](https://github.com/IFTS29/proyecto-ifts2/issues/62) (Sprint 2)
- [#64 `[QA-03]` Suite de pruebas defensivas para normalización de Instagram](https://github.com/IFTS29/proyecto-ifts2/issues/64) (Sprint 2)
- [#69 `[MEDIA-02]` Fotos de eventos optimizadas en Cloudinary](https://github.com/IFTS29/proyecto-ifts2/issues/69)
- [#70 `[UI-02]` Refinamiento de estilos y encuadre en tarjetas de eventos](https://github.com/IFTS29/proyecto-ifts2/issues/70)
- [#78 `[BUG-02]` Imagen de reemplazo de eventos rota en Vercel](https://github.com/IFTS29/proyecto-ifts2/issues/78)
- [#84 `[BUG-04]` Reemplazo de confirmaciones genéricas por ventanas propias](https://github.com/IFTS29/proyecto-ifts2/issues/84)
- [#86 `[BUG-05]` Fotos completas y visor ampliado en detalle de evento](https://github.com/IFTS29/proyecto-ifts2/issues/86)
- [#91 `[BUG-06]` Inicio del panel con datos reales](https://github.com/IFTS29/proyecto-ifts2/issues/91)
- [#40 `[QA-01]` Suite de pruebas con evidencias](https://github.com/IFTS29/proyecto-ifts2/issues/40) (Sprint 3)
- [#41 `[QA-02]` Validación visual de los 4 CRUDs](https://github.com/IFTS29/proyecto-ifts2/issues/41) (Sprint 3)
- [#42 `[DOC-01]` Manual Técnico del Sistema](https://github.com/IFTS29/proyecto-ifts2/issues/42) (Sprint 3)
- [#43 `[DOC-02]` Manual de Usuario](https://github.com/IFTS29/proyecto-ifts2/issues/43) (Sprint 3)
- [#60 `[DOC-04]` Actualización final del README](https://github.com/IFTS29/proyecto-ifts2/issues/60) (Sprint 3)
- [#109 `[TK-02.4]` Auditoría y pruebas de integración de roles (Admin y Bedelía)](https://github.com/IFTS29/proyecto-ifts2/issues/109) (Sprint 3)

---

### B. Issues ABIERTAS para el Sprint 3 (Entrega 08/11/2026)

Este es el trabajo activo para cerrar el MVP ante la cátedra:

| Issue | Título | Qué falta hacer concretamente | Responsable |
| :---: | :----- | :---------------------------- | :---------: |
| **[#81](https://github.com/IFTS29/proyecto-ifts2/issues/81)** | `[BUG-03]` Completar baja de eventos | Agregar el botón y modal de eliminación de un evento desde el panel para completar el ciclo CRUD pedido por la cátedra. | Backend / Frontend |
| **[#94](https://github.com/IFTS29/proyecto-ifts2/issues/94)** | `[QA-04]` Validación de mesas con Atlas | Registrar evidencia de publicación y retiro de un llamado en MongoDB Atlas (o base de staging) con capturas para el informe. | QA / BD |
| **[#44](https://github.com/IFTS29/proyecto-ifts2/issues/44)** | `[DOC-03]` Despliegue en producción y entrega | Merge final de `develop` a `main`, verificación de Vercel, credenciales de test en canal privado y empaquetado del ZIP de entrega. | DevOps / PO |

---

### C. Backlog Futuro / Post-MVP (Mejoras Diferidas y Continuidad)

Estas historias quedan formalmente postergadas para el equipo o etapa posterior y **no bloquean la calificación de la Etapa 3**:

- **[#61](https://github.com/IFTS29/proyecto-ifts2/issues/61) `[UI-01]` Migración de estilos a TailwindCSS:**  
  *Justificación / Gestión de Cambio:* El MVP cumplió al 100% los requisitos de accesibilidad, fluidez mobile y ritmo vertical mediante CSS nativo modular con unidades relativas (`rem`, `em`, `clamp()`) y variables semánticas (AGENTS.md). Se difiere la refactorización a TailwindCSS al backlog futuro como mejora arquitectónica para preservar la estabilidad de los 375 tests y el bundle size antes de la entrega.
- **[#45](https://github.com/IFTS29/proyecto-ifts2/issues/45) `[POST-01]`:** Soporte de arquitectura multi-carrera (si el IFTS abre nuevas ofertas académicas).
- **[#46](https://github.com/IFTS29/proyecto-ifts2/issues/46) `[POST-02]`:** Descarga masiva de información y actas archivadas en formato ZIP.
- **[#47](https://github.com/IFTS29/proyecto-ifts2/issues/47) `[CLIENTE-01]`:** Trámite institucional del dominio `.edu.ar` ante NIC Argentina.
- **[#48](https://github.com/IFTS29/proyecto-ifts2/issues/48) `[CLIENTE-02]`:** Recepción de fotos oficiales en alta resolución y cuentas institucionales definitivas.
- **[#65](https://github.com/IFTS29/proyecto-ifts2/issues/65) `[POST-03]`:** Panel de papelera interactiva con restauración de publicaciones descartadas (`Soft-Delete`).
- **Mejoras editoriales accesorias:** Edición dinámica de redes y enlaces útiles desde el panel (`#36`), importación puntual por URL de Instagram en el alta manual (`#39`).

---

## 3. Sugerencia de Plan de Acción (Orden de Ejecución Recomendado)

```text
Fase 1 (Código y QA Crítico)    ──►  Baja de eventos (#81) + Auditoría de Roles (#109) + Capturas CRUDs (#41) y Reporte (#40)
Fase 2 (Documentación Formal)   ──►  Elaboración del Manual Técnico (#42) y Manual de Usuario (#43)
Fase 3 (Verificación y Cierre)  ──►  Validación en Atlas (#94), README (#60) y prueba de correo (#37)
Fase 4 (Release y Entrega)      ──►  Merge a main, verificación en Vercel y empaquetado del ZIP (#44)
```
