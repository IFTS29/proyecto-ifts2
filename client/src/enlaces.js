// Direcciones de los sitios externos que enlaza el portal (Alumnos, Inicio, pie de página e Ingreso).
// Si una cambia, se corrige solo acá.
//
// Fuente: «Páginas a vincular con la WEB del IFTS N.º 2» (Drive del IFTS 2). Las marcadas como
// provisionales no figuran tal cual en ese documento y esperan la confirmación del IFTS 2.
export const ENLACES = {
  // Provisional: el documento pide el acceso de alumnos sin dar la dirección. Es la autogestión del mismo
  // sitio que usa la preinscripción.
  siuAlumnos: "https://guarani-autogestionagencia.bue.edu.ar/",
  // Acceso para docentes y Secretaría Académica.
  siuGestion: "https://guarani-gestionagencia.bue.edu.ar/",
  aulasVirtuales: "https://aulasvirtuales.bue.edu.ar/",
  // Provisional: el documento trae una búsqueda de Yahoo; esta es la página oficial.
  miArgentina: "https://www.argentina.gob.ar/miargentina",
  // Provisional: reemplaza a la página de ANSES del documento por la oficial del programa.
  progresar: "https://www.argentina.gob.ar/educacion/progresar",
  instagram: "https://www.instagram.com/ifts_2_ok/",
  facebook: "https://www.facebook.com/iftsn2/",
  // Preinscripción a Técnica Superior que usan los IFTS en 2026 (la ruta anterior era /preinscripcion/SSAALV/acceso).
  // Confirmación del IFTS 2 pendiente.
  preinscripcion: "https://guarani-autogestionagencia.bue.edu.ar/preinscripcion/DGAHPEF/",
  // Página oficial de Formación Técnica Superior: carreras y fechas de la convocatoria vigente (consultada el
  // 2/11/2026). Reemplaza a la página anterior de la oferta educativa, que seguía con fechas de 2025.
  ingresoOficial: "https://buenosaires.gob.ar/superior/formacion-tecnica-superior",
};

// Atributos de todo enlace externo: abre en otra pestaña sin darle acceso a esta página.
export const EXTERNO = { target: "_blank", rel: "noopener noreferrer" };
