// Lógica de las ventanas de confirmación del panel (Confirmacion.jsx), sin React, para poder probarla.
// Textos de confirmación con lenguaje institucional, claro y neutro.

// Texto compartido para salir de un formulario con cambios sin guardar (eventos y horarios).
export const DESCARTAR_CAMBIOS = {
  titulo: "¿Descartar los cambios?",
  texto: "Los cambios sin guardar se perderán al salir.",
  accion: "Descartar cambios",
  cancelar: "Seguir editando",
};

// Ingreso (Contenido institucional): vacía la convocatoria del formulario; se publica al guardar.
export const QUITAR_CONVOCATORIA = {
  titulo: "¿Quitar la convocatoria?",
  texto:
    "Se borran del formulario el cuatrimestre, el año, todas las fechas, el video y los enlaces de las etapas. Al " +
    "guardar, el sitio muestra «Fechas a confirmar». Los nombres y las aclaraciones de las etapas se conservan para " +
    "la próxima convocatoria: conviene revisarlos al cargar las fechas nuevas. El correo de consultas y las " +
    "preguntas frecuentes no cambian.",
  accion: "Quitar convocatoria",
  cancelar: "Cancelar",
  peligro: true,
};

// Cambiar el cuatrimestre o el año de una convocatoria guardada: se prepara una nueva, sin los datos de la anterior.
// Cancelar deja todo como estaba.
export const prepararConvocatoria = (anterior, nueva) => ({
  titulo: `¿Preparar la convocatoria del ${nueva}?`,
  texto:
    `Para no publicar datos de la convocatoria del ${anterior}, se borran del formulario sus fechas, el video y los enlaces de las ` +
    "etapas. Se conservan los nombres y las aclaraciones de las etapas, para revisarlos. Nada se publica hasta " +
    "guardar.",
  accion: "Preparar convocatoria nueva",
  cancelar: "Cancelar",
  peligro: true,
});

// Quitar una etapa o una pregunta frecuente del formulario. El cambio se publica al guardar.
export const quitarEtapa = (nombre) => ({
  titulo: nombre ? `¿Quitar la etapa «${nombre}»?` : "¿Quitar la etapa?",
  texto: "Se quita del formulario. Al guardar, deja de mostrarse en el sitio.",
  accion: "Quitar etapa",
  cancelar: "Cancelar",
  peligro: true,
});

export const quitarPregunta = (pregunta) => ({
  titulo: "¿Quitar la pregunta?",
  texto: (pregunta ? `«${pregunta}». ` : "") + "Se quita del formulario. Al guardar, deja de mostrarse en el sitio.",
  accion: "Quitar pregunta",
  cancelar: "Cancelar",
  peligro: true,
});

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
