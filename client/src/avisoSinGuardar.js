import { useEffect } from "react";

const PREGUNTA = "Hay cambios sin guardar. ¿Querés descartarlos?";

// Mientras "activo" sea true, pide confirmación antes de salir del formulario: al tocar cualquier enlace
// del sitio o del panel (menú lateral, Cancelar, etc.) y al cerrar o recargar la pestaña.
export function useAvisoSinGuardar(activo) {
  useEffect(() => {
    if (!activo) return undefined;

    const alTocarEnlace = (e) => {
      const enlace = e.target.closest?.("a[href]");
      if (!enlace || enlace.target === "_blank") return;
      if (!window.confirm(PREGUNTA)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const alCerrar = (e) => {
      e.preventDefault();
      e.returnValue = ""; // el navegador muestra su propio aviso
    };

    // Se escucha en la fase de captura, antes de que el enlace cambie de página.
    document.addEventListener("click", alTocarEnlace, true);
    window.addEventListener("beforeunload", alCerrar);
    return () => {
      document.removeEventListener("click", alTocarEnlace, true);
      window.removeEventListener("beforeunload", alCerrar);
    };
  }, [activo]);
}
