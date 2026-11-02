// Documentos que publica el sitio (archivos en client/public/docs).
// La información importante está también en la página (tablas HTML); el PDF es para guardar,
// imprimir o consultar el original. Cada enlace dice tipo y tamaño antes de abrirlo, para que
// nadie descargue sin saberlo, sobre todo en el celular.
// Si se reemplaza un archivo, actualizar «kb» y «paginas»: una prueba lo controla.

export const DOCUMENTOS = {
  resolucion: {
    titulo: "Resolución N.º 1202/MEGC/2007",
    descripcion: "Aprueba el plan de estudios y autoriza su dictado en el IFTS N.º 2 desde el ciclo lectivo 2007.",
    archivo: "/docs/resolucion-1202-MEGC-2007.pdf",
    kb: 207,
    paginas: 2,
  },
  anexo: {
    titulo: "Plan de estudios (Anexo de la Resolución N.º 1202/MEGC/2007)",
    descripcion: "Perfil del egresado, áreas, instancias curriculares, correlatividades y encuadre.",
    archivo: "/docs/plan-de-estudios-anexo-resolucion-1202-MEGC-2007.pdf",
    kb: 340,
    paginas: 66,
  },
  correlatividades: {
    titulo: "Correlatividades",
    descripcion: "Páginas 60 y 61 del anexo de la Resolución N.º 1202/MEGC/2007.",
    archivo: "/docs/correlatividades-resolucion-1202-MEGC-2007.pdf",
    kb: 65,
    paginas: 2,
  },
  guiaPreingreso: {
    titulo: "Guía de preingreso 2025",
    descripcion:
      "Material correspondiente al ingreso 2025. Los requisitos y procedimientos pueden haber cambiado. " +
      "Para consultar información actualizada, visitar el sitio oficial.",
    archivo: "/docs/guia-de-preingreso-2025.pdf",
    kb: 599,
    paginas: 6,
  },
  materiasPorAnio: {
    titulo: "Materias por año y cuatrimestre",
    descripcion: "Distribución de las instancias curriculares en los tres años de la carrera (IFTS N.º 2).",
    archivo: "/docs/materias-por-anio-y-cuatrimestre.pdf",
    kb: 17,
    paginas: 1,
  },
};

// «PDF, 340 KB, 66 páginas»
export const datosDelArchivo = ({ kb, paginas }) =>
  `PDF, ${kb} KB, ${paginas} ${paginas === 1 ? "página" : "páginas"}`;

// Nombre con el que se guarda: el del archivo publicado.
export const nombreDeDescarga = ({ archivo }) => archivo.split("/").pop();

// Dirección completa para compartir: siempre la pública y estable del documento.
export const direccionPublica = ({ archivo }, origen = globalThis.location?.origin) => new URL(archivo, origen).href;

// Compartir: con el menú del sistema si el dispositivo lo ofrece (casi todos los celulares);
// si no, copia el enlace. Devuelve el aviso que se muestra ("" si no hace falta ninguno).
export async function compartirDocumento(doc, entorno = globalThis) {
  const url = direccionPublica(doc, entorno.location?.origin);
  const nav = entorno.navigator;
  if (typeof nav?.share === "function") {
    try {
      await nav.share({ title: doc.titulo, url });
      return "";
    } catch (error) {
      // Cerrar el menú sin elegir nada no es un error.
      if (error?.name === "AbortError") return "";
    }
  }
  try {
    await nav.clipboard.writeText(url);
    return "Enlace copiado.";
  } catch {
    return `No se pudo copiar el enlace. Dirección: ${url}`;
  }
}
