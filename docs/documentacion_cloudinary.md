# Integración y Funcionamiento de Cloudinary en la Web App IFTS N° 2

**Proyecto:** Web App para la Tecnicatura Superior en Emprendimientos Gastronómicos (IFTS N° 2)  
**Despliegue:** [https://proyectoifts2.vercel.app/](https://proyectoifts2.vercel.app/)  
**Plataforma Multimedia:** Cloudinary (`Cloud Name: aatgrced`)

---

## 1. Contexto del Proyecto y Rol de Cloudinary

La Web App del **IFTS N° 2** promociona los emprendimientos culinarios, talleres y productos artesanales desarrollados por los estudiantes de la tecnicatura (panadería artesanal, mermeladas, salsas, conservas y eventos gastronómicos).

Dado que la aplicación incluye fotografías de alta resolución y videos de demostración en cocina, **Cloudinary** se utiliza como el servicio centralizado de media backend. Esto evita sobrecargar la plataforma de despliegue (**Vercel**) y garantiza un tiempo de carga rápido para los usuarios en computadoras y dispositivos móviles.

---

## 2. Gestión de Recursos en la Mediateca (`Assets`)

Dentro del panel de Cloudinary, los recursos están estructurados para representar el contenido de la web app.

### A. Organización por Carpetas
* **Ubicación (`Folder`):** Los archivos de los emprendimientos y talleres se almacenan en la carpeta organizada `/events`.

### B. Análisis de un Asset Gastronómico
Tomando como ejemplo el recurso `lebvccjxpovyjwxd9vnl` visible en el panel:

* **Public ID:** `events/lebvccjxpovyjwxd9vnl`
* **Tipo de Contenido:** Fotografía de productos artesanales (panes artesanales, frascos de mermelada y etiquetas de producción estudiantil).
* **Formato Original:** JPG.
* **Uso en la Web App:** Galería de muestras y emprendimientos destacados.

---

## 3. Integración Técnica en la Web App (Vercel + Cloudinary)

La Web App desplegada en Vercel consume las imágenes y videos directamente desde la CDN de Cloudinary utilizando URLs de transformación dinámica.

### Estructura de URLs para la App del IFTS2

Cada imagen servida en `proyectoifts2.vercel.app` sigue el estándar:

$$
\text{https://res.cloudinary.com/aatgrced/image/upload/}\underbrace{\text{[Parámetros de Optimización]}}_{\text{Transformación al vuelo}}/\text{events/lebvccjxpovyjwxd9vnl.jpg}
$$

### Ejemplos de Código en la Web App

#### 1. Tarjetas de Productos en la Galería (HTML / JSX)
Para renderizar las fotos de los frascos y panadería en la grilla principal, recortando la imagen automáticamente sin deformar el producto:

```html
<!-- Imagen optimizada automáticamente en formato WebP/AVIF según el navegador -->
<img 
  src="https://res.cloudinary.com/aatgrced/image/upload/w_600,h_400,c_fill,g_auto,f_auto,q_auto/events/lebvccjxpovyjwxd9vnl.jpg" 
  alt="Productos Artesanales creados por Estudiantes IFTS2" 
  loading="lazy"
/>
```

#### 2. Video Demostrativo de Cocina
Como se observa en los reportes del Dashboard, el recurso de video `t96lqgg3lc2jxuvua0gp.mp4` es uno de los más entregados (15% del ancho de banda total).

```html
<!-- Entrega del video comprimido para estudiantes en taller -->
<video controls poster="https://res.cloudinary.com/aatgrced/video/upload/so_0,w_800/t96lqgg3lc2jxuvua0gp.jpg">
  <source src="https://res.cloudinary.com/aatgrced/video/upload/q_auto,vc_h264/t96lqgg3lc2jxuvua0gp.mp4" type="video/mp4" />
</video>
```

---

## 4. Análisis del Consumo y Métricas del Proyecto

Analizando el dashboard actual de la cuenta (`aatgrced`):

| Métrica | Valor Actual | Explicación en el Contexto del Proyecto |
| :--- | :--- | :--- |
| **Credit Usage** | `0.63 / 25` (2.52%) | El plan gratuito cubre holgadamente el tráfico del portfolio de emprendimientos. |
| **Bandwidth** | `50.06 MB` | Ancho de banda total transferido hacia los visitantes de la web en Vercel. |
| **Total Requests** | `676` | Solicitudes recibidas (646 de imágenes y 30 de reproducciones de video). |
| **Image Impressions** | `440` | Muestra la carga sostenida de imágenes de los talleres en la app. |

### Assets más demandados en la Web App (`Top Delivered Assets`)

1. **`smde5ulexf1bqhwjse1o.jpg` (16.13% del ancho de banda / 8.07 MB):** Imagen del taller de cocina con estudiantes en producción.
2. **`t96lqgg3lc2jxuvua0gp.mp4` (15.00% del ancho de banda / 7.51 MB):** Video institucional o de técnicas gastronómicas en el laboratorio del IFTS.
3. **`an4gk1jftqpaj4jwih8w.jpg` (14.24% del ancho de banda / 7.13 MB):** Foto de degustación y evaluación de platos.

---

## 5. Recomendaciones de Optimización para la App

1. **Aplicar `f_auto,q_auto` en todos los componentes de la app:**
   Asegura que los visitantes desde móviles carguen imágenes comprimidas en formato `WebP` o `AVIF` reduciendo el consumo del límite de 50 MB de transferencia.
2. **Implementar Lazy Loading (`loading="lazy"`):**
   Cargar únicamente las imágenes a medida que el usuario se desplaza por el catálogo de productos gastronómicos de la página.