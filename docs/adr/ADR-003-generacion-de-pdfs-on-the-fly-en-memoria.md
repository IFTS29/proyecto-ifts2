# ADR-003: Generación de PDFs dinámicos «al vuelo» en memoria con PDFKit

* **Estado:** Aceptado  
* **Fecha:** 2026-10-25  
* **Decisores:** Equipo 404-Solutions (Backend y Arquitectura)  
* **Relacionado con:** Issue `#42`, `#33 [US-04]`, `#93`, `#94 [QA-04]`

---

## 1. Contexto y Planteo del Problema

El sistema debe permitir a los alumnos y al personal del instituto descargar documentos oficiales en formato PDF correspondientes a los **Horarios de Cursada** y las **Mesas de Examen**.

Se evaluaron tres estrategias de arquitectura:
1. **Guardar el PDF generado como archivo en la nube (Amazon S3 / Cloudinary) y almacenar la URL en MongoDB:** requiere contratar almacenamiento de objetos adicional y gestionar la invalidación de caché cada vez que Bedelía actualiza una publicación.
2. **Almacenar el archivo PDF como binario (Buffer / Base64) en MongoDB:** engorda innecesariamente la base de datos documental y satura el límite de 16 MB por documento.
3. **Generación dinámica al vuelo (*on-the-fly*) en memoria:** compilar el documento en memoria RAM en el momento exacto en que el usuario hace clic en «Descargar PDF» y enviarlo por streaming HTTP directo.

---

## 2. Decisión Adoptada

Se decidió adoptar la **generación dinámica al vuelo en memoria** utilizando la biblioteca **PDFKit**:
* Los datos estructurados (materias, comisiones, docentes, aulas, fechas, horas) residen en MongoDB Atlas.
* Los endpoints públicos (`/api/academic/vigente/horarios.pdf` y `/api/academic/vigente/mesas.pdf`) y administrativos de vista previa ejecutan el servicio `server/src/services/academica.pdf.js`.
* El servicio renderiza el diseño institucional del PDF en un buffer binario en la memoria RAM y la función `enviarPdf` (`server/src/routes/pdf.js`) lo transmite con los encabezados `Content-Type: application/pdf` y `Content-Disposition: attachment`.
* En Vercel, se incluyó la directiva `includeFiles: ["node_modules/pdfkit/js/data/**"]` en `vercel.json` para empaquetar las fuentes tipográficas nativas dentro de la función serverless.

---

## 3. Consecuencias y Trade-offs

### Consecuencias Positivas
* **Cero costo de almacenamiento:** no se almacena ningún archivo PDF dinámico en disco ni en la nube.
* **Consistencia 100% en tiempo real:** si Bedelía modifica un aula o tribunal y actualiza la publicación, el próximo PDF descargado refleja el cambio de inmediato; no hay archivos huérfanos ni enlaces desactualizados.
* **Compatibilidad Serverless:** no requiere un sistema de archivos permanente en el servidor, funcionando de forma transparente en el entorno efímero de Vercel.

### Consecuencias Negativas / Compromisos Asumidos
* **Uso de CPU del servidor:** cada descarga compila el documento en memoria; si bien para el volumen de concurrencia del IFTS N.° 2 la carga es despreciable, en un escenario de tráfico masivo (miles de descargas simultáneas por segundo) requeriría incorporar una capa de caché de borde o migrar a almacenamiento en S3.
