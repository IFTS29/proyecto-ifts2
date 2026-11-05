# ADR-005: Almacenamiento multimedia persistente desacoplado en Cloudinary

* **Estado:** Aceptado  
* **Fecha:** 2026-10-26  
* **Decisores:** Equipo 404-Solutions (Backend y DevOps)  
* **Relacionado con:** Issue `#42`, `#34 [US-05]`, `#69 [MEDIA-02]`, `#78 [BUG-02]`

---

## 1. Contexto y Planteo del Problema

La sección de eventos institucionales permite que los administradores suban hasta 20 fotografías por evento (flyers, fotos de actos, muestras gastronómicas) y sincronice publicaciones de Instagram.

Se analizaron tres opciones de persistencia para las imágenes:
1. **Almacenamiento en el disco local del servidor (`fs` en Node.js):** inviable en Vercel, ya que el sistema de archivos de las funciones serverless (`/var/task` y `/tmp`) es efímero y se destruye al reciclarse la instancia.
2. **Almacenar las imágenes en Base64 dentro de los documentos de MongoDB Atlas:** satura rápidamente la cuota gratuita de 512 MB de Atlas y choca con el límite de 16 MB por documento.
3. **Servicio externo especializado en medios (Cloudinary):** ofrece almacenamiento de imágenes, compresión automática, transformaciones responsivas y red de entrega de contenidos (CDN) bajo un plan gratuito suficiente para el proyecto.

---

## 2. Decisión Adoptada

Se decidió implementar un **adaptador híbrido de medios desacoplado en Cloudinary**:
* En entornos de producción y en Vercel, el módulo `server/src/services/media/cloudinary.js` sube las imágenes a la nube bajo el directorio `ifts2/` y devuelve una URL segura (`https://res.cloudinary.com/...`).
* En MongoDB Atlas se persiste únicamente la URL y el identificador público (`publicId`), sin almacenar bytes binarios en la base de datos.
* Para el desarrollo local sin conexión a Internet o sin credenciales, `server/src/services/media/local.js` almacena temporalmente las fotos en disco local (`storage/instagram/media`) sirviéndolas bajo la ruta `/media/instagram/...`.
* En caso de que se elimine una foto desde la edición del panel, no se borra físicamente de Cloudinary (para evitar pérdidas accidentales por fallas en edición): se traslada al array `mediosQuitados` del documento para trazabilidad.

---

## 3. Consecuencias y Trade-offs

### Consecuencias Positivas
* **Persistencia permanente en Vercel:** las imágenes se preservan intactas con independencia de los despliegues o reinicios de las funciones serverless.
* **Optimización de carga y CDN:** Cloudinary entrega formatos modernos optimizados (WebP/AVIF) según el navegador del usuario, mejorando el rendimiento en conexiones móviles.
* **Base de datos liviana:** las colecciones de MongoDB conservan documentos de pocos kilobytes de peso.

### Consecuencias Negativas / Compromisos Asumidos
* **Dependencia de servicio externo:** requiere configurar las variables de entorno `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en Vercel; si faltan, el servidor inhabilita la subida de nuevas fotos respondiendo `503 Service Unavailable` defensivo.
