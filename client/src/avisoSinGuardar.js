import { useEffect, useRef } from "react";
import { useConfirmar } from "./components/Confirmacion.jsx";
import { DESCARTAR_CAMBIOS, crearPaseUnico, enlaceQueSaleDelFormulario } from "./confirmaciones.js";

// Mientras "activo" sea true, pregunta antes de salir del formulario: al tocar un enlace del sitio o del
// panel (menú lateral, Cancelar, Cerrar sesión…) y al cerrar o recargar la pestaña.
//
// La ventana propia responde después del clic (no lo frena como window.confirm). Por eso el clic se
// detiene y, si se confirma, se repite sobre el mismo enlace dejándolo pasar una vez (crearPaseUnico).
// Así el enlace hace todo lo que hacía: por ejemplo, "Cerrar sesión" además de cambiar de página cierra
// la sesión. Los enlaces del panel son todos internos: no hay un segundo aviso del navegador al salir.
export function useAvisoSinGuardar(activo) {
  const confirmar = useConfirmar();
  const pase = useRef(null);
  if (!pase.current) pase.current = crearPaseUnico();

  useEffect(() => {
    if (!activo) return undefined;

    const alTocarEnlace = (e) => {
      const enlace = enlaceQueSaleDelFormulario(e);
      if (!enlace) return;
      if (pase.current.pasa(enlace)) return;
      e.preventDefault();
      e.stopPropagation();
      confirmar(DESCARTAR_CAMBIOS).then((descartar) => {
        if (descartar && enlace.isConnected) pase.current.repetirClic(enlace);
      });
    };
    const alCerrarPestana = (e) => {
      e.preventDefault();
      e.returnValue = ""; // al cerrar o recargar, el navegador solo permite su propio aviso
    };

    // Se escucha en la fase de captura, antes de que el enlace cambie de página.
    document.addEventListener("click", alTocarEnlace, true);
    window.addEventListener("beforeunload", alCerrarPestana);
    return () => {
      document.removeEventListener("click", alTocarEnlace, true);
      window.removeEventListener("beforeunload", alCerrarPestana);
    };
  }, [activo, confirmar]);
}
