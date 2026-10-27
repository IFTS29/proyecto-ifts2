// Lógica de las ventanas de confirmación del panel (Confirmacion.jsx), sin React, para poder probarla.
// Textos de confirmación con lenguaje institucional, claro y neutro.

// Texto compartido para salir de un formulario con cambios sin guardar (eventos y horarios).
export const DESCARTAR_CAMBIOS = {
  titulo: "¿Descartar los cambios?",
  texto: "Los cambios sin guardar se perderán al salir.",
  accion: "Descartar cambios",
  cancelar: "Seguir editando",
};

// Maneja una confirmación por vez. "pedir" muestra la pregunta (con alMostrar) y devuelve una promesa que
// siempre termina: true si se confirma; false si se cancela, se cierra con la X o con Escape.
// Si ya hay una abierta, la nueva responde false enseguida: nunca hay dos a la vez.
export function crearConfirmador(alMostrar) {
  let pendiente = null;
  return {
    pedir(opciones) {
      if (pendiente) return Promise.resolve(false);
      return new Promise((resolver) => {
        pendiente = resolver;
        alMostrar(opciones);
      });
    },
    responder(respuesta) {
      const resolver = pendiente;
      pendiente = null;
      alMostrar(null);
      resolver?.(respuesta === true);
    },
    hayUnaAbierta: () => pendiente !== null,
  };
}

// Devuelve el enlace si el clic va a sacar a la persona del formulario (misma pestaña); si no, null.
// No se pregunta en los enlaces que abren otra pestaña (target="_blank", Ctrl, Cmd, Shift o la rueda)
// ni en las descargas: el formulario sigue abierto.
export function enlaceQueSaleDelFormulario(e) {
  const enlace = e.target?.closest?.("a[href]");
  if (!enlace || enlace.target === "_blank" || enlace.hasAttribute("download")) return null;
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return null;
  return enlace;
}

// Repite el clic sobre un enlace ya confirmado y lo deja pasar una sola vez. El permiso vale solo para
// ese enlace y se borra apenas termina el clic repetido, aunque no haya llegado a pasar (por ejemplo,
// si el enlace ya no está en la página). Así no queda abierto para una navegación posterior.
export function crearPaseUnico() {
  let permitido = null;
  return {
    repetirClic(enlace) {
      permitido = enlace;
      try {
        enlace.click();
      } finally {
        permitido = null;
      }
    },
    // true si este clic es el repetido: se consume y no se vuelve a preguntar.
    pasa(enlace) {
      if (permitido === null || permitido !== enlace) return false;
      permitido = null;
      return true;
    },
  };
}
