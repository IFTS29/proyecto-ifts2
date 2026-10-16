# Renovación Web IFTS N° 2 - Prototipo

Este repositorio contiene el prototipo y la arquitectura técnica para la renovación del sitio web institucional del **IFTS N° 2**, desarrollado como Trabajo Final de la carrera de Análisis de Sistemas (IFTS N° 29).

## Objetivo del Proyecto

Modernizar la presencia digital del IFTS N° 2 mediante un diseño sobrio, accesible y orientado al perfil del egresado ("No formamos chef, formamos empresarios gastronómicos").

El sitio busca fusionar la identidad institucional pública (colores sobrios, enlaces útiles a sistemas como SIU-Guaraní) con un enfoque dinámico y profesional, automatizando la integración con las redes sociales de la institución.

## Arquitectura y Tecnologías

El sitio está diseñado para ser de **bajo mantenimiento y costo cero** para la institución:
- **Hosting:** GitHub Pages (gratuito para uso educativo/institucional).
- **Frontend:** HTML5, CSS3, JavaScript (sin frameworks pesados para garantizar rendimiento y accesibilidad).
- **Integración con Instagram:** Se utiliza la API Graph de Instagram mediante un script de automatización (`scripts/fetch_instagram.py`) que descarga las últimas publicaciones curadas y las integra de forma estática en la web.
- **CI/CD:** GitHub Actions (`.github/workflows/instagram-sync.yml`) ejecuta el script diariamente, actualizando el contenido automáticamente sin necesidad de un backend tradicional.

## Estructura del Repositorio

- `index.html`: Prototipo principal de la página de inicio.
- `DESIGN.md`: Documento con los lineamientos de diseño, paleta de colores y decisiones de UX/UI.
- `scripts/`: Scripts de automatización (Python).
- `.github/workflows/`: Pipelines de integración y despliegue continuo.
- `docs/relevamiento/`: Documentación original, notas de reuniones y archivos de articulación entre el IFTS 2 y el IFTS 29.

## Cómo desplegar este prototipo en GitHub Pages

Para compartir este prototipo con el equipo y profesores, sigue estos pasos:

1. Asegúrate de tener todos los cambios "pusheados" a GitHub:
   ```bash
   git add .
   git commit -m "feat: preparar repositorio para despliegue"
   git push origin main
   ```
2. Ve a la página del repositorio en GitHub.
3. Entra a **Settings** (Configuración) > **Pages** (Páginas) en el menú lateral izquierdo.
4. En **Source** (Fuente), bajo "Build and deployment", selecciona `Deploy from a branch`.
5. En la sección **Branch**, elige `main` y la carpeta `/(root)`.
6. Haz clic en **Save**.
7. ¡Listo! En unos minutos, GitHub te mostrará el enlace público (por ejemplo, `https://tu-usuario.github.io/ifts2-prototipo-trabajo-final/`) donde podrás ver la página en vivo.

## Documentación Técnica

Para más detalles sobre la implementación de la API de Instagram y el flujo de trabajo automático, revisa la documentación en la carpeta `docs/relevamiento/` y los comentarios en los scripts.