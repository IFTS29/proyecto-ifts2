// Secciones del contenido institucional que se editan desde el panel. Las usan el menú lateral (submenú)
// y la pantalla de edición. "enElSitio" es la página pública donde se ve lo guardado.
export const SECCIONES_CONTENIDO = [
  { clave: "perfil", titulo: "Perfil del egresado", enElSitio: "/carrera#perfil" },
  { clave: "personas", titulo: "Autoridades y tutoría", enElSitio: "/carrera#autoridades" },
  { clave: "contacto", titulo: "Datos de contacto", enElSitio: "/contacto" },
  // Ingreso en dos secciones con guardado propio: la convocatoria cambia cada cuatrimestre; las preguntas, casi nunca.
  { clave: "ingreso", titulo: "Ingreso: convocatoria", enElSitio: "/ingreso" },
  { clave: "ingresoPreguntas", titulo: "Ingreso: preguntas frecuentes", enElSitio: "/ingreso#preguntas" },
];

export const RUTA_CONTENIDO = "/admin-contenido";
export const enlaceSeccion = (clave) => `${RUTA_CONTENIDO}?seccion=${clave}`;
