# Manual de usuario del panel de administración

**Sistema:** Portal Web Institucional IFTS N.º 2  
**Destinatarios:** personal del instituto que carga y actualiza la información del sitio (Administración y Bedelía)  
**Versión:** 8/11/2026

Este manual explica, paso a paso, cómo usar el panel de administración del sitio del IFTS N.º 2. No hace falta saber de programación.

**Cómo leer las capturas:**

- Los **círculos naranjas con números** marcan los botones y campos que se usan en cada paso. El número de cada círculo coincide con el número del paso explicado junto a la captura.
- Las capturas se tomaron del sistema real, con **datos de ejemplo**: las personas, materias, fechas y eventos que aparecen son ficticios.

**Contenido:**

1. [Perfiles y permisos](#1-perfiles-y-permisos)
2. [Ingreso al panel](#2-ingreso-al-panel)
3. [Inicio del panel](#3-inicio-del-panel)
4. [Horarios de cursada](#4-horarios-de-cursada)
5. [Mesas de examen](#5-mesas-de-examen)
6. [Eventos](#6-eventos)
7. [Contenido institucional](#7-contenido-institucional)
8. [Usuarios](#8-usuarios)
9. [Mensajes y problemas frecuentes](#9-mensajes-y-problemas-frecuentes)

<br>

---

## 1. Perfiles y permisos

El panel es la parte privada del sitio. Desde ahí se cambia lo que ven los alumnos y los aspirantes en el sitio público. Cada cuenta tiene uno de estos dos perfiles:

| Sección del panel | Administración | Bedelía |
|---|:---:|:---:|
| Inicio | Sí | Sí |
| Información académica (horarios y mesas de examen) | Sí | Sí |
| Eventos | Sí | No |
| Contenido institucional | Sí | No |
| Usuarios | Sí | No |

El menú de la izquierda muestra solo las secciones del perfil de la cuenta. Así se ve el panel con una cuenta de Bedelía: solo aparecen **Inicio** e **Información académica**.

![Panel con una cuenta de Bedelía](capturas-manual/bedelia-menu.png)

Si una cuenta de Bedelía escribe en el navegador la dirección de una sección que no le corresponde, el panel la lleva al inicio.

<br>

---

## 2. Ingreso al panel

### 2.1 Iniciar sesión

La pantalla de ingreso está en la dirección del sitio seguida de `/login`.

![Pantalla de ingreso](capturas-manual/ingreso-pantalla.png)

1. **Correo electrónico:** escribir el correo de la cuenta.
2. **Contraseña:** escribir la contraseña.
3. **Ingresar:** abre el inicio del panel.
4. **Volver al sitio:** vuelve al sitio público sin ingresar.

Si la sesión ya está iniciada, la dirección `/login` lleva directo al inicio del panel.

Las cuentas las crea Administración desde la sección **Usuarios** (apartado 8). No existe una opción para registrarse.

### 2.2 Datos incorrectos y bloqueo

Si el correo o la contraseña no coinciden, el panel lo avisa e indica cuántos intentos quedan:

![Aviso de datos incorrectos](capturas-manual/ingreso-error.png)

Después de **5 intentos fallidos**, el ingreso de esa cuenta se bloquea durante **15 minutos** y el panel muestra «Demasiados intentos fallidos. Volver a intentarlo en 15 minutos.». Si no se recuerda la contraseña, Administración puede asignar una nueva desde **Usuarios** (apartado 8.3).

### 2.3 Cerrar sesión

La sesión se cierra con **Cerrar sesión**, al final del menú de la izquierda, o al cerrar la pestaña del navegador.

El acceso dura como máximo 8 horas, según la configuración del sistema. Cuando vence, el panel no vuelve solo a la pantalla de ingreso: al intentar una acción muestra «La sesión venció. Iniciar sesión de nuevo.». En ese caso, hay que tocar **Cerrar sesión** e ingresar otra vez.

### 2.4 El sitio público con la sesión iniciada

**Ver el sitio**, en el menú de la izquierda, abre el sitio público. Mientras la sesión está iniciada, el sitio muestra abajo a la derecha un botón con las iniciales de la cuenta:

![Botón de la sesión en el sitio público](capturas-manual/sesion-cartel-cerrado.png)

1. **Sesión:** abre un recuadro con las opciones de la sesión.

El botón no aparece sin sesión iniciada, ni dentro del panel ni en la pantalla de ingreso.

![Recuadro de la sesión abierto](capturas-manual/sesion-cartel-abierto.png)

1. **Volver al panel:** regresa al panel sin volver a ingresar.
2. **Cerrar sesión:** cierra la sesión.
3. **Cerrar menú:** cierra el recuadro. También se cierra con la tecla Esc, al hacer clic afuera o al cambiar de página.

En el celular, el botón se muestra más chico y funciona igual:

![Botón de la sesión en un celular](capturas-manual/sesion-cartel-celular.png)

<br>

---

## 3. Inicio del panel

Es la primera pantalla después de ingresar. Muestra accesos rápidos y un resumen de lo que está publicado.

![Inicio del panel](capturas-manual/panel-inicio.png)

1. **Menú de secciones:** lleva a cada parte del panel.
2. **Tareas frecuentes:** accesos directos a cargar un evento, a la información académica y a la lista de eventos.
3. **Resumen de lo publicado:** cantidad de eventos que se ven en el sitio, período de horarios publicado y llamados de mesas publicados.
4. **Actividad reciente:** los últimos cambios hechos en el panel, con su fecha.
5. **Ver el sitio:** abre el sitio público (apartado 2.4).
6. **Cerrar sesión.**
7. **Cuenta con la sesión iniciada:** iniciales y nombre.

Una cuenta de Bedelía ve solo los accesos y datos de la información académica.

<br>

---

## 4. Horarios de cursada

Se encuentra en **Información académica → Horarios de cursada**.

> **Regla principal:** guardar no cambia el sitio. Los alumnos ven solo lo que está **publicado**. Se puede cargar y corregir todo lo necesario sin que se vea, y los cambios llegan al sitio al usar **Publicar** o **Actualizar publicación**.

### 4.1 Resumen del período

Cada período (por ejemplo, «2.º cuatrimestre 2026») tiene sus propias materias.

![Resumen del período de horarios](capturas-manual/horarios-resumen.png)

1. **Horarios de cursada / Mesas de examen:** cambia entre las dos partes de la información académica.
2. **Período:** elige el período. La opción **Otro período…** crea uno nuevo.
3. **Estado:** indica si el período está publicado y cuándo se publicó por última vez.
4. **Ver y editar horarios:** abre la tabla de materias del período.
5. **Vista previa:** muestra el PDF tal como lo van a ver los alumnos.
6. **Retirar publicación:** saca el período del sitio (apartado 4.6).

### 4.2 Tabla de materias

![Tabla de materias del período](capturas-manual/horarios-tabla.png)

1. **+ Agregar materia:** abre el formulario de carga (apartado 4.3).
2. **Reutilizar horarios:** copia las materias de otro período (apartado 4.7).
3. **Buscar:** filtra por materia o docente.
4. **Año de la carrera:** muestra solo un año.
5. **Editar** (lápiz): abre la materia para corregirla.
6. **Eliminar** (tacho): quita la materia, previa confirmación.
7. **Volver al resumen:** regresa al resumen del período.

### 4.3 Cargar una materia

![Formulario para agregar una materia](capturas-manual/horarios-formulario.png)

1. **Año de la carrera.**
2. **Turno.**
3. **Materia:** al escribir aparecen las materias del plan de estudios para elegir.
4. **Docente (opcional):** si queda vacío, el sitio muestra «A designar».
5. **Aula (opcional).**
6. **Día, Desde y Hasta:** día y franja horaria, en formato de 24 horas.
7. **Agregar otro día u horario:** suma otra franja para la misma materia.
8. **Guardar:** guarda la materia y cierra el formulario.
9. **Guardar y agregar otra:** guarda y deja el formulario listo para la siguiente materia.

La materia queda guardada en el panel, **pero no se ve en el sitio hasta publicar** (apartado 4.5).

### 4.4 Eliminar una materia

Al tocar el tacho de una fila, el panel pide confirmación:

![Confirmación para eliminar una materia](capturas-manual/horarios-eliminar.png)

Si el período está publicado, los alumnos siguen viendo la versión publicada hasta que se actualice la publicación.

### 4.5 Publicar y actualizar

En un período sin publicar, el resumen muestra el botón **Publicar**. Al tocarlo, el panel pide confirmación:

![Confirmación para publicar los horarios](capturas-manual/horarios-publicar.png)

Al confirmar, el período aparece en la sección **Alumnos** del sitio.

Si después se modifica una materia de un período publicado, el resumen lo avisa:

![Aviso de cambios guardados sin publicar](capturas-manual/horarios-sin-publicar.png)

1. **Aviso:** los alumnos todavía ven la versión anterior.
2. **Ver cambios:** muestra qué cambió respecto de lo publicado.
3. **Actualizar publicación:** publica los cambios, previa confirmación.

La comparación muestra cada cambio con su valor publicado y su valor guardado:

![Comparación entre lo publicado y lo guardado](capturas-manual/horarios-ver-cambios.png)

### 4.6 Retirar la publicación

**Retirar publicación** saca el período del sitio. Las materias quedan guardadas en el panel y el período se puede volver a publicar.

![Confirmación para retirar la publicación](capturas-manual/horarios-retirar.png)

### 4.7 Reutilizar horarios de otro período

Sirve para no cargar desde cero un período parecido a otro. Desde la tabla de materias, **Reutilizar horarios** abre esta ventana:

![Ventana para reutilizar horarios](capturas-manual/horarios-reutilizar.png)

Se elige el período de origen y se confirma con **Reutilizar horarios**. Se agregan solo las materias que todavía no están cargadas, y **no se publica nada**. Después se corrigen las materias que hayan cambiado.

### 4.8 Períodos anteriores

Los períodos no se borran. El sitio muestra los períodos publicados del año actual y el más reciente de todos; los demás pasan al archivo de forma automática y siguen visibles en el panel, marcados como anteriores.

<br>

---

## 5. Mesas de examen

Se encuentra en **Información académica → Mesas de examen**. Vale la misma regla que en los horarios: **guardar no cambia el sitio**.

Las mesas se organizan por **llamado** (por ejemplo, «Diciembre 2026»). Cada llamado tiene su período de exámenes, un aviso opcional para los alumnos y sus mesas.

### 5.1 Resumen del llamado

![Resumen de un llamado publicado](capturas-manual/mesas-publicado.png)

1. **Llamado:** elige el llamado. La opción **Nuevo llamado…** crea uno nuevo (apartado 5.2).
2. **Editar datos del llamado:** cambia el nombre, las fechas o el aviso.
3. **Ver y editar mesas:** abre la tabla de mesas del llamado.
4. **Vista previa:** muestra el PDF tal como lo van a ver los alumnos.
5. **PDF publicado:** abre el PDF que se ve hoy en el sitio.
6. **Retirar publicación:** saca el llamado del sitio. Las mesas quedan guardadas.

Un llamado sin publicar muestra, en cambio, los botones **Publicar** y **Eliminar llamado**.

### 5.2 Crear un llamado

![Formulario de un llamado nuevo](capturas-manual/mesas-llamado.png)

Completar el **nombre del llamado** (obligatorio y distinto de los demás), las fechas de **inicio** y **cierre**, y el **aviso para los alumnos** (por ejemplo, cómo inscribirse). Las fechas y el aviso son opcionales. Tocar **Guardar**.

Un llamado se puede publicar sin mesas, como anuncio con sus fechas y el aviso. Si no tiene aviso, el sitio muestra «El cronograma por materia se publicará próximamente.».

### 5.3 Cargar una mesa

Desde **Ver y editar mesas**:

![Tabla de mesas del llamado](capturas-manual/mesas-tabla.png)

1. **+ Agregar mesa:** abre el formulario.
2. **Editar** (lápiz): corrige una mesa.
3. **Eliminar** (tacho): quita una mesa, previa confirmación.

En el formulario se completan la materia, el año de la carrera, la fecha, la hora, el aula y la mesa examinadora:

![Formulario de una mesa](capturas-manual/mesas-formulario.png)

Si la fecha o la hora quedan vacías, el sitio muestra «A confirmar».

### 5.4 Publicar, actualizar y eliminar

- **Publicar** y **Actualizar publicación** funcionan igual que en los horarios (apartado 4.5): piden confirmación y recién entonces el llamado se ve en el sitio.
- **Un llamado que alguna vez se publicó no se puede eliminar.** Si ya no hace falta, se retira la publicación.
- Los llamados anteriores dejan de verse en el sitio de forma automática cuando pasan más de 30 días desde su última fecha. El llamado publicado más reciente sigue visible mientras no se retire su publicación. Ningún llamado se borra: todos siguen en el panel.

<br>

---

## 6. Eventos

Sección solo para Administración. Reúne los eventos cargados desde el panel y los que llegan desde Instagram.

### 6.1 Lista de eventos

![Lista de eventos](capturas-manual/eventos-lista.png)

1. **Sincronizar Instagram:** trae las publicaciones de la cuenta del instituto (apartado 6.8). Aparece deshabilitado si el sistema no tiene configurada la conexión con Instagram.
2. **Cargar evento:** abre el formulario de carga (apartado 6.2).
3. **Estado de Instagram:** indica si hay conexión y el resultado de la última sincronización.
4. **Pestañas:** **Todos**, **En el sitio**, **Ocultos** y **Archivo**, con la cantidad de eventos de cada una.
5. **Editar** (lápiz): abre el evento para modificarlo (apartado 6.5).
6. **Ocultar:** saca el evento del sitio sin borrarlo (apartado 6.6).
7. **Ver en el sitio:** abre el evento en el sitio público, en otra pestaña.

### 6.2 Cargar un evento con fotos

![Formulario para cargar un evento](capturas-manual/eventos-formulario.png)

1. **Título del evento.**
2. **Fecha del evento:** cuándo se realizó o se realizará la actividad.
3. **Resumen (opcional):** una línea que se muestra en la tarjeta del evento.
4. **Descripción.**
5. **Publicación o video de Instagram (opcional):** ver el apartado 6.3.
6. **Portada:** la foto que se muestra en la tarjeta. Al principio es la primera.
7. **Usar como portada:** elige otra foto como portada.
8. **Quitar foto** (cruz): saca la foto de la lista.
9. **Agregar fotos:** abre la selección de imágenes. Se aceptan JPG, PNG y WebP, hasta 20 fotos por evento. El sistema las achica antes de subirlas.
10. **Visible en el sitio:** si está marcado, el evento se publica al guardar. Si no, queda oculto.
11. **Guardar evento.**

Al guardar, el panel vuelve a la lista y muestra «El evento se guardó correctamente.».

### 6.3 Cargar un evento con el enlace de una publicación de Instagram

En lugar de fotos, se puede pegar en el campo **Publicación o video de Instagram** el enlace de una publicación, un reel o un video de Instagram (direcciones que contienen `/p/`, `/reel/` o `/tv/`).

- **Si no se cargan fotos,** el sistema intenta obtener la imagen de la publicación y la guarda como foto del evento.
- **Si no puede obtenerla,** guarda el evento igual y avisa que en el sitio se intentará mostrar la publicación de Instagram:

![Aviso cuando no se pudo obtener la imagen de la publicación](capturas-manual/eventos-enlace-guardado.png)

En ese caso, se puede editar el evento y agregarle una foto desde la computadora (apartado 6.5).

El enlace tiene que ser de una publicación. El enlace de un perfil (por ejemplo, `instagram.com/ifts2/`) no se acepta, y el panel muestra este aviso:

![Aviso de enlace de Instagram no válido](capturas-manual/eventos-enlace-invalido.png)

**Una publicación genera un solo evento.** Si ya existe un evento con esa publicación, cargado a mano o traído por la sincronización, el panel no crea otro e indica cuál es, para editarlo desde la lista:

![Aviso de publicación que ya tiene evento](capturas-manual/eventos-repetido.png)

### 6.4 Eventos que aparecen dos veces

El sistema reconoce una misma publicación por su enlace. Un evento cargado **solo con fotos de la computadora**, sin el enlace, no se puede relacionar con su publicación: si después se sincroniza esa misma publicación, quedan dos eventos. En ese caso, se oculta uno de los dos (apartado 6.6). Para evitarlo, conviene cargar el enlace de la publicación cuando existe.

### 6.5 Editar un evento

El lápiz de cada fila abre el mismo formulario con los datos cargados:

![Edición de un evento](capturas-manual/eventos-editar.png)

1. **Quitar foto** (cruz): saca la foto del evento.
2. **Usar como portada:** cambia la foto de portada.
3. **Agregar fotos:** suma fotos, hasta completar 20.
4. **Guardar cambios.**

Las fotos que se quitan dejan de verse en el sitio, pero no se borran del almacenamiento de imágenes.

En un evento que vino de Instagram, lo que se edita en el panel se conserva aunque se vuelva a sincronizar.

### 6.6 Ocultar y volver a mostrar

**Ocultar** saca el evento del sitio. El panel pide confirmación:

![Confirmación para ocultar un evento](capturas-manual/eventos-ocultar.png)

El evento pasa a la pestaña **Ocultos**, desde donde se vuelve a publicar:

![Pestaña de eventos ocultos](capturas-manual/eventos-ocultos.png)

1. **Mostrar:** cambia el estado del evento de «Oculto» a «Visible», previa confirmación. Si el evento es de un año que ya está en el archivo (apartado 6.7), además hay que activar **Mostrar en el sitio** para que vuelva a aparecer.

El panel no tiene un botón para borrar eventos: un evento que ya no tiene que verse se oculta.

### 6.7 Archivo de eventos

El sitio muestra los eventos del año actual y del año anterior. Los de años previos pasan solos a la pestaña **Archivo**, sin borrarse:

![Pestaña Archivo](capturas-manual/eventos-archivo.png)

1. **Mostrar en el sitio:** vuelve a mostrar en el sitio un evento archivado. Para quitarlo otra vez, se usa **Volver a archivar**.

Un evento oculto no se muestra en el sitio aunque tenga activado **Mostrar en el sitio**.

### 6.8 Sincronizar con Instagram

**Sincronizar Instagram** trae las publicaciones de la cuenta del instituto que tengan el hashtag **#eventosIFTS2**. Revisa las últimas 20 publicaciones de la cuenta.

**Cómo escribir la publicación en Instagram para que el evento quede bien:**

- Escribir el **título en el primer renglón**, corto (hasta 100 caracteres).
- Escribir la descripción desde el segundo renglón.
- Incluir **#eventosIFTS2** en cualquier parte del texto. Los hashtags no se copian al título ni a la descripción.

**Qué hace la sincronización:**

- Crea un evento por cada publicación nueva. La fecha del evento es la de la publicación; si la actividad fue otro día, se corrige editando el evento.
- No vuelve a importar una publicación que ya tiene evento, aunque ese evento esté oculto.
- Al terminar, muestra el resultado: en verde si terminó bien, en ámbar si quedaron publicaciones para la próxima sincronización y en rojo si hubo un error.

Si aparece un error, la carga manual de eventos sigue funcionando. La conexión con Instagram necesita renovarse aproximadamente cada 60 días: si la sincronización empieza a fallar, avisar a quien administre el sistema.

<br>

---

## 7. Contenido institucional

Sección solo para Administración. Al tocar **Contenido institucional** en el menú, se despliegan sus cinco partes: **Perfil del egresado**, **Autoridades y tutoría**, **Datos de contacto**, **Ingreso: convocatoria** e **Ingreso: preguntas frecuentes**.

> **A diferencia de los horarios y las mesas, acá no hay un paso de publicar:** al guardar, los cambios se ven enseguida en el sitio.

### 7.1 Funcionamiento común

Mientras no se elige una parte en el menú, la pantalla pide elegir una. Todas las partes funcionan igual; se muestra el ejemplo del perfil del egresado:

![Perfil del egresado](capturas-manual/contenido-perfil.png)

1. **Parte que se edita,** elegida en el menú de la izquierda.
2. **Quitar** (tacho): elimina ese párrafo o ese elemento.
3. **Agregar:** suma un párrafo o un elemento nuevo.
4. **Guardar cambios:** publica los cambios en el sitio.
5. **Ver cómo queda en el sitio:** abre la página pública correspondiente.

Si se intenta salir con cambios sin guardar, el panel lo avisa antes.

### 7.2 Perfil del egresado

Hasta 6 párrafos de texto simple, sin negritas ni listas.

### 7.3 Autoridades y tutoría

Hasta 12 personas. Por cada una se cargan el nombre, el cargo y dónde se muestra (Autoridades o Tutoría); la aclaración es opcional. Las flechas cambian el orden.

![Autoridades y tutoría](capturas-manual/contenido-autoridades.png)

### 7.4 Datos de contacto

La dirección, el barrio y ciudad y el horario son obligatorios. La modalidad, el teléfono y el correo son opcionales: si quedan vacíos, no se muestran en el sitio.

![Datos de contacto](capturas-manual/contenido-contacto.png)

### 7.5 Ingreso: convocatoria

Es la información de la convocatoria de ingreso: cuatrimestre y año, fechas de preinscripción, otras etapas (hasta 6), video de YouTube y correo de consultas.

![Convocatoria de ingreso](capturas-manual/ingreso-convocatoria.png)

1. **Cuatrimestre** de la convocatoria.
2. **Año** de la convocatoria. Sin cuatrimestre ni año, el sitio muestra «Fechas a confirmar».
3. **Quitar convocatoria:** vacía la convocatoria del formulario, previa confirmación. El cambio se aplica al tocar **Guardar cambios**. Si la convocatoria que estaba guardada tenía cuatrimestre, año y alguna fecha, se conserva en **Convocatorias anteriores**.
4. **Preinscripción, Desde y Hasta:** con estas fechas el sitio indica si la preinscripción es próxima, está abierta o finalizó.

Al elegir otro cuatrimestre o año, se borran las fechas, el video y los enlaces de la convocatoria guardada, y el panel lo avisa antes.

Cada etapa se abre tocando su nombre. **Todas las etapas necesitan fecha de inicio** («Desde»); la fecha de cierre es opcional.

![Etapa de ingreso abierta para editar](capturas-manual/ingreso-etapas.png)

Si falta alguna fecha de inicio, el panel no guarda y lo indica:

![Aviso por fecha de inicio faltante](capturas-manual/ingreso-validacion.png)

Con todas las fechas completas, el panel guarda y lo confirma:

![Convocatoria guardada](capturas-manual/ingreso-guardado.png)

### 7.6 Ingreso: preguntas frecuentes

Hasta 10 preguntas, cada una con su respuesta. Las flechas cambian el orden en que se muestran en la página de Ingreso.

![Preguntas frecuentes de ingreso](capturas-manual/contenido-faq.png)

<br>

---

## 8. Usuarios

Sección solo para Administración. Desde acá se crean y administran las cuentas del panel.

### 8.1 Crear un usuario

![Sección Usuarios](capturas-manual/usuarios-lista.png)

1. **Nombre y apellido.**
2. **Correo electrónico:** con este correo se ingresa al panel. No puede repetirse.
3. **Rol:** Administrador o Bedelía (apartado 1).
4. **Contraseña inicial:** al menos 8 caracteres, con una mayúscula y un número. Se le comunica a la persona por un medio privado.
5. **Agregar usuario.**
6. **Editar:** cambia los datos de una cuenta (apartado 8.3).
7. **Eliminar:** borra una cuenta (apartado 8.4).

Si el correo ya está registrado, el panel no crea la cuenta y lo avisa:

![Aviso de correo repetido](capturas-manual/usuarios-correo-repetido.png)

### 8.2 Reglas de las cuentas

- Siempre tiene que quedar al menos una cuenta de Administración.
- Nadie puede eliminar su propia cuenta ni cambiar su propio rol.
- Una cuenta eliminada pierde el acceso en ese momento, aunque tenga la sesión iniciada.

### 8.3 Editar un usuario y cambiar su contraseña

**Editar** abre los datos de la cuenta:

![Edición de un usuario](capturas-manual/usuarios-editar.png)

Si **Contraseña nueva** queda vacía, se mantiene la actual. Para asignar una contraseña nueva a quien la olvidó, se escribe en ese campo y se guarda.

### 8.4 Eliminar un usuario

**Eliminar** pide confirmación antes de borrar la cuenta:

![Confirmación para eliminar un usuario](capturas-manual/usuarios-eliminar.png)

<br>

---

## 9. Mensajes y problemas frecuentes

| Mensaje o situación | Causa | Solución |
|---|---|---|
| «Usuario o contraseña incorrectos. Quedan N intentos antes del bloqueo temporal.» | El correo o la contraseña no coinciden. | Revisar los datos. Si no se recuerda la contraseña, pedir a Administración una nueva (8.3). |
| «Demasiados intentos fallidos. Volver a intentarlo en 15 minutos.» | Hubo 5 intentos fallidos con esa cuenta. | Esperar 15 minutos. |
| «La sesión venció. Iniciar sesión de nuevo.» | Pasó la duración máxima de la sesión. | Tocar **Cerrar sesión** e ingresar otra vez (2.3). |
| Se cambió un horario o una mesa y el sitio sigue igual. | Guardar no publica. | Usar **Publicar** o **Actualizar publicación** (4.5). |
| Al entrar a una sección, el panel vuelve al inicio. | El perfil de la cuenta no tiene acceso a esa sección. | Pedir a Administración el cambio de perfil, si corresponde. |
| «Ya hay un usuario con ese correo.» | Ese correo ya tiene una cuenta. | Usar otro correo o editar la cuenta existente. |
| «Tiene que quedar al menos un administrador.» | Se intentó eliminar la última cuenta de Administración o quitarle ese rol. | Crear antes otra cuenta de Administración. |
| «Etapa N: completar la fecha de inicio.» | Una etapa de ingreso no tiene fecha «Desde». | Completar la fecha o quitar la etapa. |
| «El enlace de Instagram no es válido…» | El enlace no es de una publicación, un reel o un video. | Copiar el enlace de la publicación desde Instagram (6.3). |
| «Ya existe un evento con esta publicación de Instagram…» | Esa publicación ya tiene un evento. | Editar el evento existente desde la lista (6.5). |
| «El evento se guardó, pero no se pudo obtener la imagen…» | Instagram no entregó la imagen de la publicación. | Editar el evento y agregar una foto desde la computadora (6.5). |
| **Sincronizar Instagram** está deshabilitado, o la sincronización termina en error. | No está configurada la conexión con Instagram, o venció. | Avisar a quien administre el sistema. La carga manual sigue funcionando. |
| Un evento aparece dos veces. | Se cargó solo con fotos y después se sincronizó la misma publicación. | Ocultar uno de los dos (6.4). |
