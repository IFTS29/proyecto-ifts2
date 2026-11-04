# Validación visual de los CRUDs

**Issue:** #41 [QA-02]
**Base:** rama `develop`, commit `ea8d2cc`, 4 de noviembre de 2026

Este documento recorre, con capturas paso a paso, las cuatro operaciones (crear, leer, actualizar y eliminar o dar de baja) en Usuarios, Mesas de examen, Eventos e Ingreso. Las imágenes están en `docs/capturas-cruds/`.

## Cómo se hicieron las capturas

- Servidor y cliente levantados con `npm run dev` desde la raíz, sin `MONGODB_URI`, o sea en modo memoria: los datos se pierden al reiniciar.
- Administrador inicial creado con las variables `SEED_ADMIN_*` (usuario de prueba `admin@prueba.local`).
- Todos los datos cargados son de prueba (nombres, fechas, aula, fotos). No son datos reales del instituto.
- Navegador Chromium con ventana de 1280 × 800 px.
- Las capturas se sacaron en un entorno sin acceso a Google Fonts, así que la tipografía puede diferir un poco de la que se ve en producción.
- Cada recorrido se hizo con un script de Playwright que sigue los pasos en orden, por lo que se puede repetir si cambia la interfaz.

## Alcance

Se cubren los cuatro CRUDs que nombra el issue, con una salvedad: de Mesas/Horarios se documentan las **mesas de examen**. Los horarios de cursada (materias por período) no están capturados todavía.


## Usuarios

Pantalla Usuarios del panel (solo Administrador). Rol con el que se hicieron las capturas: Administrador.

**Paso 1.** Leer: pantalla Usuarios con la lista inicial (solo el administrador cargado al arrancar).

![Usuarios, paso 1](capturas-cruds/usuarios-01.png)

**Paso 2.** Crear: formulario completo para una usuaria con rol Bedelía.

![Usuarios, paso 2](capturas-cruds/usuarios-02.png)

**Paso 3.** Crear: la usuaria nueva aparece en la tabla y el formulario queda vacío.

![Usuarios, paso 3](capturas-cruds/usuarios-03.png)

**Paso 4.** Crear (error): un correo ya registrado se rechaza con un mensaje.

![Usuarios, paso 4](capturas-cruds/usuarios-04.png)

**Paso 5.** Actualizar: se abre la edición con los datos de la usuaria.

![Usuarios, paso 5](capturas-cruds/usuarios-05.png)

**Paso 6.** Actualizar: se cambia el nombre en el formulario de edición.

![Usuarios, paso 6](capturas-cruds/usuarios-06.png)

**Paso 7.** Actualizar: el nombre nuevo se ve en la tabla.

![Usuarios, paso 7](capturas-cruds/usuarios-07.png)

**Paso 8.** Eliminar: el sistema pide confirmación antes de borrar.

![Usuarios, paso 8](capturas-cruds/usuarios-08.png)

**Paso 9.** Eliminar: el usuario ya no figura en la tabla.

![Usuarios, paso 9](capturas-cruds/usuarios-09.png)


## Mesas de examen

Información académica, pestaña Mesas de examen (Administrador y Bedelía). Capturado como Administrador. Incluye lo que ve el alumno en el sitio público.

**Paso 1.** Leer: Mesas de examen sin llamados cargados.

![Mesas de examen, paso 1](capturas-cruds/mesas-01.png)

**Paso 2.** Crear llamado: nombre, fechas y aviso para los alumnos.

![Mesas de examen, paso 2](capturas-cruds/mesas-02.png)

**Paso 3.** Crear llamado: el llamado queda guardado como datos de trabajo, sin publicar.

![Mesas de examen, paso 3](capturas-cruds/mesas-03.png)

**Paso 4.** Leer: tabla de mesas del llamado, todavía vacía.

![Mesas de examen, paso 4](capturas-cruds/mesas-04.png)

**Paso 5.** Crear mesa: materia, año, fecha, hora, aula y mesa examinadora.

![Mesas de examen, paso 5](capturas-cruds/mesas-05.png)

**Paso 6.** Crear mesa: la mesa aparece en la tabla.

![Mesas de examen, paso 6](capturas-cruds/mesas-06.png)

**Paso 7.** Actualizar mesa: se abre la edición con los datos cargados.

![Mesas de examen, paso 7](capturas-cruds/mesas-07.png)

**Paso 8.** Actualizar mesa: el aula nueva (Aula 5) figura en la tabla; la segunda mesa quedó sin hora ni aula.

![Mesas de examen, paso 8](capturas-cruds/mesas-08.png)

**Paso 9.** Eliminar mesa: el sistema pide confirmación.

![Mesas de examen, paso 9](capturas-cruds/mesas-09.png)

**Paso 10.** Eliminar mesa: queda una sola mesa en la tabla.

![Mesas de examen, paso 10](capturas-cruds/mesas-10.png)

**Paso 11.** Leer: resumen del llamado, listo para publicar.

![Mesas de examen, paso 11](capturas-cruds/mesas-11.png)

**Paso 12.** Publicar: el sistema pide confirmación y avisa qué verán los alumnos.

![Mesas de examen, paso 12](capturas-cruds/mesas-12.png)

**Paso 13.** Publicar: el llamado figura como publicado.

![Mesas de examen, paso 13](capturas-cruds/mesas-13.png)

**Paso 14.** Leer (sitio público): en Alumnos se ve la mesa publicada.

![Mesas de examen, paso 14](capturas-cruds/mesas-14.png)

**Paso 15.** Retirar publicación: el sistema pide confirmación.

![Mesas de examen, paso 15](capturas-cruds/mesas-15.png)

**Paso 16.** Retirar publicación: los alumnos dejan de ver el llamado; los datos se conservan.

![Mesas de examen, paso 16](capturas-cruds/mesas-16.png)


## Eventos

Panel de Eventos (solo Administrador) y página pública Eventos. El panel no tiene botón de eliminar: la baja del sitio se hace con Ocultar, y la baja definitiva sigue pendiente en el issue #81.

**Paso 1.** Leer: lista de eventos del panel, todavía sin eventos cargados.

![Eventos, paso 1](capturas-cruds/eventos-01.png)

**Paso 2.** Crear: formulario completo con título, fecha, resumen, descripción y dos fotos.

![Eventos, paso 2](capturas-cruds/eventos-02.png)

**Paso 3.** Crear: el evento aparece en la lista del panel.

![Eventos, paso 3](capturas-cruds/eventos-03.png)

**Paso 4.** Leer (sitio público): el evento se ve en la página Eventos.

![Eventos, paso 4](capturas-cruds/eventos-04.png)

**Paso 5.** Actualizar: se abre la edición con los datos y las fotos del evento.

![Eventos, paso 5](capturas-cruds/eventos-05.png)

**Paso 6.** Actualizar: se modifican el título y el resumen.

![Eventos, paso 6](capturas-cruds/eventos-06.png)

**Paso 7.** Actualizar: la lista muestra el título nuevo.

![Eventos, paso 7](capturas-cruds/eventos-07.png)

**Paso 8.** Ocultar (baja del sitio): el sistema pide confirmación.

![Eventos, paso 8](capturas-cruds/eventos-08.png)

**Paso 9.** Ocultar: el evento pasa a la pestaña Ocultos y deja de verse en el sitio.

![Eventos, paso 9](capturas-cruds/eventos-09.png)

**Paso 10.** Ocultar: la página pública Eventos ya no lo muestra.

![Eventos, paso 10](capturas-cruds/eventos-10.png)

**Paso 11.** Mostrar: el evento vuelve al sitio (no se borró nada al ocultarlo).

![Eventos, paso 11](capturas-cruds/eventos-11.png)


## Ingreso: convocatoria

Contenido institucional, sección Ingreso: convocatoria (solo Administrador), y la página pública Ingreso. Acá el alta, la modificación y la baja se hacen sobre una misma convocatoria.

**Paso 1.** Leer: sección Ingreso, convocatoria del panel de Contenido institucional, sin convocatoria cargada.

![Ingreso: convocatoria, paso 1](capturas-cruds/ingreso-01.png)

**Paso 2.** Crear: se elige el cuatrimestre y el año, y se cargan las fechas de la preinscripción.

![Ingreso: convocatoria, paso 2](capturas-cruds/ingreso-02.png)

**Paso 3.** Crear: se abre la primera etapa (Curso de ingreso) y se cargan sus fechas.

![Ingreso: convocatoria, paso 3](capturas-cruds/ingreso-03.png)

**Paso 4.** Crear (validación): con convocatoria cargada, el sistema exige la fecha de inicio de todas las etapas y no guarda.

![Ingreso: convocatoria, paso 4](capturas-cruds/ingreso-04.png)

**Paso 5.** Crear: con todas las etapas completas se guarda la convocatoria y el panel lo confirma.

![Ingreso: convocatoria, paso 5](capturas-cruds/ingreso-05.png)

**Paso 6.** Leer (sitio público): la página Ingreso muestra la convocatoria y el cronograma cargado.

![Ingreso: convocatoria, paso 6](capturas-cruds/ingreso-06.png)

**Paso 7.** Actualizar: se amplía la fecha de cierre de la preinscripción y se cambia la aclaración.

![Ingreso: convocatoria, paso 7](capturas-cruds/ingreso-07.png)

**Paso 8.** Actualizar: se guardan los cambios.

![Ingreso: convocatoria, paso 8](capturas-cruds/ingreso-08.png)

**Paso 9.** Actualizar (sitio público): la página Ingreso muestra el plazo ampliado.

![Ingreso: convocatoria, paso 9](capturas-cruds/ingreso-09.png)

**Paso 10.** Eliminar: el sistema pide confirmación antes de quitar la convocatoria.

![Ingreso: convocatoria, paso 10](capturas-cruds/ingreso-10.png)

**Paso 11.** Eliminar: la convocatoria quedó vacía y guardada; las etapas conservan nombres como modelo.

![Ingreso: convocatoria, paso 11](capturas-cruds/ingreso-11.png)

**Paso 12.** Eliminar (sitio público): sin convocatoria, el sitio muestra «Fechas a confirmar».

![Ingreso: convocatoria, paso 12](capturas-cruds/ingreso-12.png)


## Observaciones

- **Validación de Ingreso.** Con una convocatoria cargada, el panel exige la fecha de inicio de todas las etapas, incluidas las que vienen de modelo (Examen de ingreso, Confirmación de vacantes, Inicio de clases). Si falta alguna, no guarda y marca la etapa con el mensaje «completar la fecha de inicio». Está en el paso 4 de Ingreso.
- **Baja de eventos.** Hoy el panel permite ocultar y mostrar un evento, pero no eliminarlo (issue #81). Los pasos de «Ocultar» documentan lo que existe.
- **Roles.** Todas las capturas son con el rol Administrador. La diferencia con Bedelía, que no ve Eventos, Contenido ni Usuarios, no está registrada acá; corresponde al issue #109.
