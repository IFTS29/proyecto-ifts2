# ADR-004: Separación estricta entre datos de trabajo y datos publicados

* **Estado:** Aceptado  
* **Fecha:** 2026-10-22  
* **Decisores:** Equipo 404-Solutions (Negocio, Backend y UX)  
* **Relacionado con:** Issue `#42`, `#33 [US-04]`, `#35 [US-06]`

---

## 1. Contexto y Planteo del Problema

El personal de Bedelía necesita cargar y ajustar calendarios complejos (horarios de comisiones, turnos, docentes y fechas de mesas de examen). Este proceso editorial demanda tiempo y suele realizarse en varias sesiones.

Si el sistema publicara los cambios inmediatamente con cada «Guardar», los alumnos verían información incompleta, comisiones sin aula asignada o calendarios a medio cargar mientras Bedelía está trabajando.

Se evaluaron dos alternativas:
1. **Un solo documento con bandera `publicado: true/false`:** cada edición sobre una materia ya publicada afectaría directamente lo que ve el alumno, o exigiría ocultar todo el período mientras se hace una modificación menor.
2. **Separación de datos de trabajo (borradores) y datos publicados (fotografía oficial):** mantener dos colecciones independientes; Bedelía trabaja sobre borradores y la publicación reemplaza atómicamente la copia que ve el público.

---

## 2. Decisión Adoptada

Se decidió implementar el patrón de **Separación de Datos de Trabajo vs. Datos Publicados**:
* **Horarios:** Bedelía trabaja sobre la colección `horarios` (borradores con validación flexible). Cuando decide publicar, el sistema crea o actualiza un documento en la colección `publicaciones_horarios`, generando una instantánea atómica de las materias de ese ciclo lectivo y cuatrimestre.
* **Mesas de examen:** los llamados se guardan en `llamados` y sus mesas de trabajo en `mesas_examen`. Al publicar, el llamado incrusta un subdocumento inmutable `publicacion` con la lista de mesas congeladas a esa fecha.
* **Retiro de publicación:** la acción «Retirar publicación» marca la copia como despublicada (`publicado: false` o `publicacion: null`), conservando todos los datos de trabajo intactos en el panel para futuros ajustes sin pérdida de información.

---

## 3. Consecuencias y Trade-offs

### Consecuencias Positivas
* **Experiencia de usuario protegida:** los alumnos nunca ven estados intermedios, errores de tipeo ni calendarios incompletos.
* **Publicación atómica:** la actualización de un período entero se ejecuta en una única operación de base de datos; nunca existe una mezcla visible entre la versión anterior y la nueva.
* **Comparación de cambios (*Diff*):** permite que el panel compare el borrador actual contra la última versión publicada, destacando con etiquetas amarillas qué materias cambiaron antes de confirmar la actualización.

### Consecuencias Negativas / Compromisos Asumidos
* **Duplicación controlada de datos:** la información publicada es una copia desnormalizada de los datos de trabajo; sin embargo, dado que el volumen de texto de las materias es reducido, el impacto en almacenamiento es despreciable frente a los beneficios de atomicidad.
