# Documentación del Proyecto de Base de Datos - MongoDB Atlas (IFTS 2)

Este documento detalla el proceso de despliegue, configuración y la estructura de la base de datos NoSQL implementada en **MongoDB Atlas** para el sistema del **IFTS 2**.

---

## 1. Despliegue y Configuración del Cluster

### 1.1 Configuración Inicial (`Deploy your cluster`)
Para el aprovisionamiento de la base de datos se seleccionó la modalidad gratuita en la nube, garantizando un entorno ideal para desarrollo y pruebas sin costes operativos.

* **Nivel de Servicio (Tier):** `Free` (Gratuito)
  * **Almacenamiento:** 512 MB
  * **RAM / vCPU:** Compartido (Shared)
  * **Conexiones Máximas:** 500 conexiones simultáneas
* **Proveedor de Nube (Cloud Provider):** Amazon Web Services (AWS)
* **Región:** `N. Virginia (us-east-1)` (Seleccionada por recomendación de baja latencia y menor huella de carbono).
* **Ajustes de Seguridad y Datos:**
  * Configuración de seguridad automatizada (`Automate security setup`).
  * Sin carga de datos de ejemplo predeterminados para mantener un entorno limpio.

---

<img src="img-bbdd/bbdd_deploy_cluster.png" width="" height="" alt="deploy-bbdd-ifts-2"/>


### 1.2 Vista General del Cluster (`Database Overview`)
Una vez creado el cluster dentro del proyecto `IFTS2DataBase` (Organización `Mario's Org`), la consola principal muestra el estado operativo y las métricas de rendimiento en tiempo real:

* **Estado:** `ACTIVE` (En funcionamiento normal).
* **Uso de Almacenamiento:** `427.24 KB / 512 MB` (Menos del 1% del total disponible).
* **Versión de MongoDB:** `8.0.36`.
* **Monitoreo de Rendimiento:**
  * **Conexiones activas:** Gráfica con picos recientes alcanzando cerca de 45 conexiones activas simultáneas.
  * **Rendimiento de E/S (Throughput):** Métricas separadas de Lectura (`Read`) y Escritura (`Write`), registrando ráfagas de lectura de hasta $0.5\text{ ops/s}$.

---

<img src="img-bbdd/bbdd_overview.png" width="" height="" alt="overview-bbdd-ifts-2"/>

## 2. Estructura de la Base de Datos y Colecciones

El clúster se llama `ifts2` y la base de datos que usa el sitio se llama `test`. A través del **Data Explorer**, se identifican las siguientes colecciones estructuradas para dar soporte a la plataforma:

### Colecciones Existentes:
1. `contenidoinstitucional`
2. `convocatoriasanteriores`
3. `eventos`
4. `horarios`
5. `instagramsyncs`
6. `llamados`
7. `mesas_examen`
8. `publicaciones_horarios`
9. `usuarios`

---

## 3. Análisis Detallado de Colecciones Específicas

### 3.1 Colección: `usuarios`
Almacena la información de los usuarios del sistema (usuarios con rol de Administración o Bedelía), gestionando la autenticación y los roles dentro de la plataforma.

* **Ejemplo de Documento (Esquema Básico):**
  * `_id`: `ObjectId` (Identificador único de MongoDB).
  * `nombre`: `String` (Nombre completo del usuario, ej. *"Matías Peláez"*, *"Mario González"*, *"Miguel"*, *"Rachel"*).
  * `mail`: `String` (Correo electrónico institucional o personal).
  * `rol`: `String` (Nivel de acceso, ej. `"admin"`, `"bedelia"`).
  * `passwordHash`: `String` (Hash de la contraseña con bcrypt, `$2a$10$...`).
  * `createdAt`: `ISODate` (Fecha y hora de creación).
  * `updatedAt`: `ISODate` (Fecha y hora de la última modificación).
  * `__v`: `Number` (Control de versiones de Mongoose).

---

<img src="img-bbdd/bbdd_usuarios.png" width="" height="" alt="usuarios-bbdd-ifts-2"/>

### 3.2 Colección: `eventos`
Almacena los eventos del instituto: cargados manualmente desde el panel o importados desde Instagram con el botón «Sincronizar Instagram».

* **Ejemplo de Documento (Esquema Básico):**
  * `_id`: `ObjectId`
  * `origen`: `String` (Origen de la publicación, ej. `"instagram"`).
  * `instagramId`: `String` (ID propio de la red social).
  * `permalink`: `String` (Enlace directo a la publicación/reel original).
  * `titulo`: `String` (Título descriptivo del evento o noticia).
  * `resumen` / `descripcion` / `captionOriginal`: `String` (Textos descriptivos del evento, emoticonos y cuerpo de la publicación).
  * `editadoPorAdmin`: `Boolean` (`false` / `true`).
  * `fechaEvento` / `fechaPublicacionOriginal`: `ISODate`.
  * `tipoMedio`: `String` (Tipo de contenido visual, ej. `"IMAGE"`).
  * `fotoPrincipal`: `String` (URL almacenada en CDN/Cloudinary).
  * `estado`: `String` (Visibilidad de la publicación, ej. `"visible"`).
  * `categorias`: `Array` (Listado de categorías asociadas).
  * `createdAt` / `updatedAt`: `ISODate`.

---

### 3.3 Colección: `contenidoinstitucional`
Almacena bloques de información institucionales específicos y configurables dinámicamente.

* **Ejemplo de Documento (Esquema Básico):**
  * `_id`: `ObjectId`
  * `clave`: `String` (Identificador clave del contenido, ej. `"ingreso"`).
  * `actualizadoEn`: `ISODate` (Registro de última actualización).
  * `actualizadoPor`: `String` (Nombre del usuario responsable del cambio, ej. `"Matías Peláez"`).
  * `datos`: `Object` (Objeto embebido con la información detallada según la sección).

---
<img src="img-bbdd/bbdd_contenido_institucional.png" width="" height="" alt="ont-institucional-bbdd-ifts-2"/>

## 4. Resumen Técnico

| Módulo / Elemento | Detalle Técnico |
| :--- | :--- |
| **Entorno de Hosting** | MongoDB Atlas Cloud (AWS us-east-1) |
| **Arquitectura de Base de Datos** | Documental / NoSQL (JSON/BSON) |
| **Seguridad de Usuarios** | Hash de contraseñas con bcrypt + Roles de acceso |
| **Integraciones Externas** | CDN (Cloudinary) para media e integración de syncs con Instagram |
