# Reporte de pruebas automáticas

**Proyecto:** Portal Web Institucional IFTS N.° 2, 404-Solutions (IFTS N.° 29, PP4)
**Issue:** #40 [QA-01]
**Base de la ejecución:** rama `develop`, commit `ea8d2cc` (merge del PR #110), 4 de noviembre de 2026
**Entorno:** Node.js 22.22.0, Linux, sin conexión a MongoDB Atlas, Cloudinary, Meta ni SMTP (todo con repositorios en memoria y adaptadores simulados, como describe `docs/plan-de-testing.md`)

## 1. Resultado

Se ejecutó `npm test` desde la raíz del repositorio.

| Pruebas | Aprobadas | Falladas | Canceladas | Omitidas |
| :-: | :-: | :-: | :-: | :-: |
| 375 | 375 | 0 | 0 | 0 |

La suite completa tardó unos 25 segundos en el entorno donde se corrió. El plan de testing dice que la suite corre en menos de 2 segundos; con las 375 pruebas actuales esa cifra ya no se cumple, conviene actualizarla en el plan.

Además de la corrida completa, cada archivo de `server/test/` se ejecutó por separado con `node --test`. Los 38 archivos pasan y la suma de sus pruebas da las mismas 375.

## 2. Pruebas por archivo

| Archivo | Pruebas | Qué verifica |
| :-- | :-: | :-- |
| `academica.test.js` | 22 | Validación de horarios, publicar/retirar un período, comparar con lo publicado, reutilizar un período anterior y PDF público y de vista previa |
| `admin.inicio.test.js` | 8 | Resumen del inicio del panel: horarios y llamados publicados, actividad reciente, vistas de Administrador y de Bedelía |
| `alumnos.test.js` | 6 | Filtros de año y turno en Horarios de cursada |
| `archivo.test.js` | 12 | Archivado automático de eventos, horarios y mesas, con fechas de Argentina |
| `arranque.test.js` | 7 | Cuándo se exige MongoDB (producción, Vercel) y cuándo se trabaja en memoria (desarrollo) |
| `auth.test.js` | 12 | Login con JWT, bloqueo tras 5 intentos fallidos, token alterado, correo sin distinguir mayúsculas |
| `config.test.js` | 5 | Dirección del sitio y detección de Vercel |
| `confirmaciones.test.js` | 7 | Ventana propia de confirmación en lugar del `confirm` del navegador |
| `contacto.limite.test.js` | 10 | Límite de envíos del formulario de contacto (429) y uso de la IP en Vercel |
| `contacto.test.js` | 14 | Validaciones del formulario, motivos, teléfono, honeypot y error de envío |
| `contenido.cliente.test.js` | 7 | Autoridades y tutoría en el sitio: orden, iniciales, fecha y consultas |
| `contenido.test.js` | 10 | Contenido institucional editable: permisos, validación y valores iniciales |
| `correo.mensaje.test.js` | 9 | A quién llega cada motivo de consulta y qué dice el correo |
| `correo.smtp.test.js` | 11 | Envío por SMTP, errores y configuración incompleta |
| `enlaces.test.js` | 5 | Enlaces externos: https, pestaña nueva, un solo lugar donde se definen |
| `eventos.edicion.test.js` | 10 | Editar, ocultar y mostrar un evento sin tocar fotos ni origen |
| `eventos.formulario.test.js` | 11 | Fecha del evento a mediodía de Argentina y campos obligatorios |
| `eventos.fotos.test.js` | 15 | Alta con fotos y qué se borra si falla la subida o el guardado |
| `eventos.galeria.test.js` | 26 | Quitar, agregar y reordenar fotos, portada, límite de 20 y videos |
| `eventos.sitio.test.js` | 16 | Tarjetas de eventos en el sitio, direcciones de Instagram aceptadas |
| `eventos.test.js` | 8 | Permisos y validaciones del alta de eventos (401, 403, 400) |
| `finalizados.test.js` | 5 | Marcas de «período terminado» y «turno finalizado», y bloques por año en Eventos |
| `ingreso.historial.test.js` | 7 | Historial de convocatorias de ingreso |
| `ingreso.test.js` | 24 | Convocatoria de ingreso: fechas, etapas, enlaces, video, estado de la preinscripción |
| `instagram.bloque.test.js` | 6 | Estado de la conexión con Instagram que se muestra en el panel |
| `instagram.sin-conexion.test.js` | 7 | Comportamiento sin credenciales de Instagram (503, sin crear eventos) |
| `instagram.sincronizacion.test.js` | 9 | Sincronización: no repite descargas, publicaciones incompletas quedan pendientes |
| `instagram.test.js` | 12 | Casos CP-IG del plan de testing: caption, hashtags, álbumes, textos largos |
| `mesas.celular.test.js` | 3 | Fichas de mesas de examen en pantallas de celular |
| `mesas.panel.test.js` | 3 | Textos del panel de mesas y coherencia con el PDF |
| `mesas.test.js` | 19 | Llamados y mesas: alta, edición, baja, publicar, retirar y PDF |
| `passwords.test.js` | 3 | Política de contraseñas y hash |
| `plan.test.js` | 17 | Plan de estudios: 37 instancias contra la resolución, horas y totales |
| `publicacion.test.js` | 3 | Los PDF de `client/public/docs` llegan al build de Vercel |
| `salud.test.js` | 2 | `/api/salud` y rutas inexistentes con 404 en JSON |
| `seed.test.js` | 2 | Administrador inicial, y que no se cree ninguno sin las variables `SEED_ADMIN_*` |
| `usuarios.test.js` | 18 | Alta, edición y baja de usuarios, permisos por rol, protección del último administrador |
| `visor.test.js` | 4 | Visor ampliado de fotos de un evento |
| **Total** | **375** | |

## 3. Casos seleccionados con entrada, salida esperada y salida obtenida

Son una muestra de las 375 pruebas, elegida para cubrir seguridad, los cuatro CRUDs y los servicios externos. «Salida obtenida» es el resultado de la corrida del 4/11 descrita arriba. El nombre de la prueba es el que aparece en el archivo.

| ID | Archivo | Entrada | Salida esperada | Salida obtenida |
| :-- | :-- | :-- | :-- | :-- |
| QA-AUTH-01 | `auth.test.js` | Login con correo y contraseña correctos | Devuelve token y datos del usuario, sin el hash | Aprobado |
| QA-AUTH-02 | `auth.test.js` | Cinco contraseñas incorrectas seguidas y luego la correcta | Quinto intento bloquea; la correcta también se rechaza durante la ventana | Aprobado |
| QA-AUTH-03 | `auth.test.js` | Mismo bloqueo, cambiando la IP declarada o las mayúsculas del correo | El bloqueo se mantiene | Aprobado |
| QA-AUTH-04 | `auth.test.js` | Token con una modificación | Se rechaza (401) | Aprobado |
| QA-USR-01 | `usuarios.test.js` | Bedelía intenta listar o crear usuarios | 403 | Aprobado |
| QA-USR-02 | `usuarios.test.js` | Administrador da de alta un usuario | Se guarda con hash y ese usuario puede iniciar sesión | Aprobado |
| QA-USR-03 | `usuarios.test.js` | Alta con un correo ya usado (otras mayúsculas) | 409 | Aprobado |
| QA-USR-04 | `usuarios.test.js` | Un administrador intenta eliminarse a sí mismo | Se rechaza | Aprobado |
| QA-USR-05 | `usuarios.test.js` | Administrador cambia la contraseña de un usuario | La anterior deja de servir y la nueva sirve | Aprobado |
| QA-EVT-01 | `eventos.test.js` | Alta de evento sin sesión | 401 | Aprobado |
| QA-EVT-02 | `eventos.test.js` | Alta de evento con usuario Bedelía | 403 | Aprobado |
| QA-EVT-03 | `eventos.test.js` | Alta sin título o sin descripción | 400 con el mensaje | Aprobado |
| QA-EVT-04 | `eventos.edicion.test.js` | Editar título, resumen, descripción y fecha | Se actualizan y no cambian fotos, origen ni estado | Aprobado |
| QA-EVT-05 | `eventos.edicion.test.js` | Ocultar y luego mostrar un evento | Sale del sitio y vuelve, sin borrar nada | Aprobado |
| QA-EVT-06 | `eventos.galeria.test.js` | Cargar o editar con más de 20 fotos | Se rechaza | Aprobado |
| QA-EVT-07 | `eventos.fotos.test.js` | Falla la subida de la segunda foto | 502, el evento no se guarda y se borra la primera foto subida | Aprobado |
| QA-ACA-01 | `academica.test.js` | Agregar, corregir y eliminar una materia | Funciona; corregir no cambia el período | Aprobado |
| QA-ACA-02 | `academica.test.js` | Guardar cambios en un período publicado | Los alumnos siguen viendo la versión anterior hasta actualizar | Aprobado |
| QA-ACA-03 | `academica.test.js` | Retirar un período publicado | Los alumnos dejan de verlo, no se borra nada | Aprobado |
| QA-MES-01 | `mesas.test.js` | Alta de llamado con nombre repetido (mayúsculas y espacios distintos) | Se rechaza; por dos altas simultáneas responde 409 | Aprobado |
| QA-MES-02 | `mesas.test.js` | Eliminar un llamado ya publicado y retirado | No se puede eliminar | Aprobado |
| QA-MES-03 | `mesas.test.js` | Publicar un llamado sin mesas | Se publica como anuncio | Aprobado |
| QA-ING-01 | `ingreso.test.js` | Administración guarda la convocatoria de ingreso | El sitio la ve; Bedelía no puede guardarla | Aprobado |
| QA-ING-02 | `ingreso.test.js` | Enlace de una etapa con una dirección que no es https | Se rechaza | Aprobado |
| QA-ING-03 | `ingreso.historial.test.js` | Cargar una convocatoria nueva sobre otra vigente | La anterior pasa al historial; corregir la misma no la manda al historial | Aprobado |
| QA-ARC-01 | `archivo.test.js` | Evento de hace dos años o más | Se archiva y deja de mostrarse, también por enlace directo | Aprobado |
| QA-CON-01 | `contacto.test.js` | Consulta válida | Se envía y responde 200 | Aprobado |
| QA-CON-02 | `contacto.test.js` | Campo oculto (honeypot) lleno | Responde como éxito pero no envía nada | Aprobado |
| QA-CON-03 | `contacto.limite.test.js` | Se supera el límite de intentos | 429 y no se envía el correo | Aprobado |
| QA-IG-01 | `instagram.sin-conexion.test.js` | Sincronizar sin token ni id de cuenta | 503 con el motivo, sin consultar a Instagram ni crear eventos | Aprobado |
| QA-IG-02 | `instagram.sincronizacion.test.js` | Falla la descarga de un archivo de una publicación | No se importa incompleta; la próxima sincronización la completa | Aprobado |
| QA-IG-03 | `instagram.test.js` | CP-IG-04: texto de más de 2.000 caracteres sin saltos de línea | Se procesa sin bloqueo y se acorta el resumen | Aprobado |
| QA-ARR-01 | `arranque.test.js` | Producción sin `MONGODB_URI` | No arranca en memoria | Aprobado |
| QA-ARR-02 | `arranque.test.js` | Vercel con la base caída | 503 en JSON y reintento en la próxima petición | Aprobado |
| QA-SEED-01 | `seed.test.js` | Arranque sin las variables `SEED_ADMIN_*` | No se crea ningún usuario | Aprobado |

## 4. Qué cubre y qué no

La suite prueba el servidor, las reglas de negocio y algunas funciones puras del cliente (iniciales, fechas, textos del panel). No ejecuta un navegador, así que los carruseles, el modal de fotos y el aspecto de las pantallas no se prueban acá: eso queda para las capturas del issue #41.

Tampoco se probó contra servicios reales. La conexión con MongoDB Atlas, con Cloudinary, con Instagram y el envío real de correo dependen de credenciales que las pruebas no usan a propósito. La validación con Atlas corresponde al issue #94.

Del plan de testing, la fila CP-IG-11 (restaurar una publicación desde la papelera) está marcada como Post-MVP y no tiene prueba.

## 5. Observaciones de la corrida

- **`npm ci` falla en la raíz.** Con el `package-lock.json` de `develop`, `npm ci` termina con error porque el lock no incluye `cloudinary@2.11.0` ni `pdfkit@0.20.2`, que sí están en el `package.json`. Para correr las pruebas se usó `npm install`, que actualiza el lock. Conviene que alguien del equipo lo regenere y lo suba, porque la regla de PRs del plan de testing y el README piden instalar con `npm ci`.
- **`npm audit` informa 4 vulnerabilidades** (3 moderadas, 1 alta) en dependencias de desarrollo y en `react-router`. Arreglarlas con `npm audit fix --force` implica subir Vite y React Router a versiones nuevas con cambios que rompen compatibilidad, así que se dejó para después de la entrega.
