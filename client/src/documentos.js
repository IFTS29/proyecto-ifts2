// Documentos que publica el sitio (archivos en client/public/docs).
// La información importante está también en la página (tablas HTML); el PDF es para guardar,
// imprimir o consultar el original. Cada enlace dice tipo y tamaño antes de abrirlo, para que
// nadie descargue sin saberlo, sobre todo en el celular.
// Si se reemplaza un archivo, actualizar «kb» y «paginas»: una prueba lo controla.

export const DOCUMENTOS = {
  resolucion: {
    titulo: "Resolución N.º 1202/MEGC/2007",
    descripcion: "Plan de estudios completo: perfil, áreas, instancias, correlatividades y encuadre.",
    archivo: "/docs/resolucion-1202-MEGC-2007.pdf",
    kb: 340,
    paginas: 66,
  },
  correlatividades: {
    titulo: "Correlatividades",
    descripcion: "Páginas 60 y 61 de la Resolución N.º 1202/MEGC/2007.",
    archivo: "/docs/correlatividades-resolucion-1202-MEGC-2007.pdf",
    kb: 64,
    paginas: 2,
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
