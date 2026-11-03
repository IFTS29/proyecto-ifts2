// Ayudas para los formularios de eventos (alta y edición).

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Día AAAA-MM-DD (el formato del campo de fecha) tal como se ve en Argentina.
export const diaEnArgentina = (fecha = new Date()) =>
  new Date(fecha).toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });

// Fecha que se guarda para un día elegido: mediodía en Argentina. Así se ve el mismo día en el sitio
// (de noche en UTC no cambia el día, como pasaría con la medianoche).
export const fechaDelDia = (dia) => new Date(`${dia}T12:00:00-03:00`).toISOString();

// Datos del formulario a partir de un evento guardado (o vacío, con la fecha de hoy).
export const valoresDeEvento = (evento = {}) => ({
  titulo: evento.titulo || "",
  fecha: diaEnArgentina(evento.fechaEvento || new Date()),
  resumen: evento.resumen || "",
  descripcion: evento.descripcion || "",
});

// Revisa que estén los datos obligatorios. Devuelve el mensaje para mostrar o "" si está todo.
export function faltaUnDato(valores) {
  if (!valores.titulo.trim()) return "Completá el título del evento.";
  if (!valores.fecha) return "Elegí la fecha del evento.";
  if (!valores.descripcion.trim()) return "Completá la descripción del evento.";
  return "";
}

// Textos y fecha listos para mandar al servidor. En la edición se pasa "inicial": si el día no cambió,
// la fecha no se manda y el servidor conserva la original, con su hora. Antes se revisa con faltaUnDato,
// así que el día nunca llega vacío.
export function datosBasicosParaEnviar(valores, inicial = null) {
  const datos = {
    titulo: valores.titulo.trim(),
    resumen: valores.resumen.trim(),
    descripcion: valores.descripcion.trim(),
  };
  const cambioElDia = !inicial || valores.fecha !== inicial.fecha;
  if (valores.fecha && cambioElDia) datos.fechaEvento = fechaDelDia(valores.fecha);
  return datos;
}

// ----- Fotos de la galería (edición) -----
// Cada foto del formulario es { id, url, nombre? }. Las que ya estaban en el evento usan su enlace como id.

// Mismas reglas que en el servidor (galeriaEvento.js): los videos no se editan desde el panel, y una
// portada que no está en la lista de medios (eventos de Instagram de una sola foto o eventos viejos)
// se muestra como una foto más para que no se pierda.
// La regla de la miniatura vale solo para eventos de Instagram (ver galeriaEvento.js).
// El detalle del sitio (Evento.jsx) usa esta misma función para decidir qué medios se reproducen.
export const esVideo = (medio, evento = {}) => {
  const url = String(medio.url || "");
  if (medio.tipo === "VIDEO" || medio.mediaType === "VIDEO") return true;
  if (/\.(mp4|mov|webm)(\?|$)/i.test(url) || url.includes("/video/upload/")) return true;
  return evento.origen === "instagram" && Boolean(medio.thumbnailUrl) && medio.thumbnailUrl !== medio.url;
};
const esReemplazo = (url) => String(url).includes("placeholder");
const esEnlaceDeFoto = (url) => /^https?:\/\/\S+$/i.test(url) || /^\/(?!\/)\S*$/.test(url) || url.startsWith("data:image/");

function portadaSuelta(evento) {
  const url = evento.fotoPrincipal;
  if (evento.tipoMedio === "VIDEO" || !url || esReemplazo(url) || url === evento.videoThumbnail) return null;
  if (!esEnlaceDeFoto(url)) return null;
  const estaEnMedios = (evento.medios || []).some((medio) => medio.url === url || medio.thumbnailUrl === url);
  return estaEnMedios ? null : url;
}

// Fotos editables de un evento guardado, en orden: la portada suelta (si hay) y las de la galería.
export function fotosDeEvento(evento = {}) {
  const suelta = portadaSuelta(evento);
  const urls = (evento.medios || [])
    .filter((medio) => medio.url && !esVideo(medio, evento) && !esReemplazo(medio.url))
    .map((medio) => medio.url);
  return (suelta ? [suelta, ...urls] : urls).map((url) => ({ id: url, url }));
}

const claves = (fotos) => fotos.map((foto) => foto.id).join("\n");

// Hubo cambios en las fotos: alguna nueva, alguna quitada o un orden distinto (por ejemplo, otra portada).
export const cambiaronLasFotos = (fotos, iniciales) => claves(fotos) !== claves(iniciales);

// Fotos que estaban en el evento y se quitaron en esta edición (todavía sin guardar).
export function fotosQuitadas(fotos, iniciales) {
  const quedan = new Set(fotos.map((foto) => foto.id));
  return iniciales.filter((foto) => !quedan.has(foto.id));
}

// Vuelve a poner las fotos quitadas, cada una en el lugar que tenía.
export function volverAPoner(fotos, iniciales) {
  const resultado = [...fotos];
  iniciales.forEach((foto, lugar) => {
    if (!resultado.some((f) => f.id === foto.id)) resultado.splice(Math.min(lugar, resultado.length), 0, foto);
  });
  return resultado;
}

// La portada es la primera foto: elegir otra la pasa al primer lugar.
export function usarComoPortada(fotos, id) {
  const elegida = fotos.find((foto) => foto.id === id);
  return elegida ? [elegida, ...fotos.filter((foto) => foto.id !== id)] : fotos;
}

// ----- Visor de fotos del sitio (VisorFotos.jsx) -----

// Posición de la foto anterior (paso -1) o siguiente (paso 1). Después de la última sigue la primera.
export const indiceVecino = (indice, total, paso) => (total > 0 ? (indice + paso + total) % total : 0);

// ----- Sincronización con Instagram (AdminEventos.jsx) -----

// Mensaje del panel con el resultado de una sincronización. "nuevos" son los eventos creados y "pendientes",
// las publicaciones que no se pudieron importar. "tipo" define el color del aviso: exito, parcial (quedó
// alguna publicación pendiente) o error.
export function mensajeDeSincronizacion(resultado) {
  if (!resultado?.success) return { texto: "No se pudo sincronizar con Instagram.", tipo: "error" };

  const { nuevos = 0, pendientes = 0 } = resultado;
  let texto = "Sincronización finalizada.";
  if (nuevos === 1) texto += " Se incorporó 1 evento.";
  else if (nuevos > 1) texto += ` Se incorporaron ${nuevos} eventos.`;
  else if (pendientes === 0) texto += " No se encontraron publicaciones nuevas con #eventosIFTS2.";

  if (pendientes === 1) {
    texto += " No se pudo importar 1 publicación. Se podrá reintentar en una próxima sincronización.";
  } else if (pendientes > 1) {
    texto += ` No se pudieron importar ${pendientes} publicaciones. Se podrán reintentar en una próxima sincronización.`;
  }
  return { texto, tipo: pendientes > 0 ? "parcial" : "exito" };
}

// Fecha de la última sincronización, en hora de Argentina y formato de 24 horas:
// "hoy a las 23:19" o "el 30/10/2026 a las 09:05". Devuelve null si no hay fecha válida.
export function textoDeFechaDeSincronizacion(fechaIso, ahora = new Date()) {
  const fecha = new Date(fechaIso);
  if (!fechaIso || Number.isNaN(fecha.getTime())) return null;
  const hora = fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ZONA_HORARIA,
  });
  if (diaEnArgentina(fecha) === diaEnArgentina(ahora)) return `hoy a las ${hora}`;
  const dia = fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA_HORARIA });
  return `el ${dia} a las ${hora}`;
}

// Textos del bloque de Instagram del panel, según el estado que informa /api/instagram/status:
// "conectado" (hay credenciales y la última sincronización funcionó o todavía no se sincronizó),
// "estado" ("error" si falló la última, por la conexión o por otro motivo) y "ultimaSincronizacion" (la última
// que terminó bien; un error no la cambia). "tipo" define la etiqueta: funcionando, sin-sincronizar, error o
// sin-conexion.
export function textosDelBloqueDeInstagram(estado = {}, ahora = new Date()) {
  const fecha = textoDeFechaDeSincronizacion(estado.ultimaSincronizacion, ahora);

  if (estado.estado === "error") {
    return {
      titulo: "Instagram: error de sincronización",
      texto: `No se pudo completar la última sincronización con Instagram.${fecha ? ` Última sincronización correcta: ${fecha}.` : ""}`,
      etiqueta: "Error de sincronización",
      tipo: "error",
    };
  }
  // Sin credenciales no se puede sincronizar: no se muestra la fecha para no confundir.
  if (!estado.conectado) {
    return {
      titulo: "Instagram sin conectar",
      texto: "No hay una conexión configurada con Instagram. Los eventos pueden cargarse manualmente desde el panel.",
      etiqueta: "Sin conexión",
      tipo: "sin-conexion",
    };
  }

  const alSincronizar = `Al sincronizar, se incorporan las publicaciones con ${estado.hashtag || "#eventosIFTS2"}.`;
  // Con credenciales pero sin ninguna sincronización todavía no se comprobó la conexión: "configurado".
  if (!fecha) {
    return {
      titulo: "Instagram configurado",
      texto: `${alSincronizar} Todavía no se realizó ninguna sincronización.`,
      etiqueta: "Sin sincronizar",
      tipo: "sin-sincronizar",
    };
  }
  return {
    titulo: estado.cuenta ? `Instagram conectado: ${estado.cuenta}` : "Instagram conectado",
    texto: `${alSincronizar} Última sincronización: ${fecha}.`,
    etiqueta: "Funcionando",
    tipo: "funcionando",
  };
}

// El botón "Sincronizar Instagram" se habilita solo si /api/instagram/status confirmó que hay credenciales
// ("configurado"). Mientras se consulta el estado, o si la consulta falla, queda deshabilitado. Después de un
// error de sincronización sigue habilitado, para reintentar.
export const puedeSincronizar = (estado = {}, sincronizando = false) => estado.configurado === true && !sincronizando;

// ----- Galería pública: Inicio, Eventos y detalle de un evento -----

export const IMAGEN_DE_REEMPLAZO = "/media/instagram/placeholder.svg";

// Dirección de una publicación de Instagram, o null si no lo es. Solo acepta https en instagram.com
// (con o sin www) y una publicación, reel o video (/p/, /reel/, /tv/). Se revisa con URL y no buscando
// el texto «instagram.com», así un enlace como «javascript:…» o «https://otro.sitio/instagram.com/p/x»
// nunca se usa como enlace. Devuelve la dirección sin parámetros, que es la que acepta la publicación incrustada.
export function direccionDeInstagram(texto) {
  let url;
  try {
    url = new URL(String(texto || "").trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)) return null;
  const ruta = url.pathname.match(/^\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)\/?$/);
  return ruta ? `https://www.instagram.com/${ruta[1]}/${ruta[2]}/` : null;
}

// Publicación de Instagram de un evento: el enlace de la sincronización (permalink) o el que se cargó a mano.
export const enlaceDeInstagram = (evento = {}) =>
  direccionDeInstagram(evento.permalink) || direccionDeInstagram(evento.videoUrl);

// Un evento es de Instagram si llegó por la sincronización o si se cargó con el enlace de una publicación.
// Los cargados a mano con fotos de la computadora no lo son.
export const esDeInstagram = (evento = {}) => evento.origen === "instagram" || Boolean(enlaceDeInstagram(evento));

const miniaturaUtil = (url) => (url && !esReemplazo(url) ? url : null);

// Archivo de video que el sitio puede reproducir: https o una ruta del propio sitio, con extensión de video
// o subido como video a Cloudinary. Un enlace a una página (Instagram, YouTube) o «javascript:» no lo es.
const esArchivoDeVideo = (url) =>
  /^(https:\/\/|\/(?!\/))\S+$/i.test(String(url || "")) && esVideo({ url });

// Fotos y videos propios del evento, en orden, para la galería del detalle. Las fotos siguen las reglas de
// fotosDeEvento (las mismas del panel y del visor); los videos, las de esVideo. Una publicación de Instagram
// no es un video propio: se muestra incrustada solo si no hay nada más (ver medioPrincipal).
export function galeriaDeEvento(evento = {}) {
  const fotos = new Set(fotosDeEvento(evento).map((foto) => foto.url));
  const items = [];
  const suelta = portadaSuelta(evento);
  if (suelta) items.push({ tipo: "foto", url: suelta });
  for (const medio of evento.medios || []) {
    if (!medio.url || direccionDeInstagram(medio.url)) continue;
    if (esVideo(medio, evento)) {
      if (!esArchivoDeVideo(medio.url)) continue;
      const miniatura = miniaturaUtil(medio.thumbnailUrl) || miniaturaUtil(evento.videoThumbnail);
      items.push({ tipo: "video", url: medio.url, miniatura });
    } else if (fotos.has(medio.url)) {
      items.push({ tipo: "foto", url: medio.url });
    }
  }
  // Video de Instagram guardado fuera de la galería (sincronización de un video suelto).
  const video = evento.videoUrl;
  if (esArchivoDeVideo(video) && !items.some((item) => item.url === video)) {
    items.push({ tipo: "video", url: video, miniatura: miniaturaUtil(evento.videoThumbnail) });
  }
  return items;
}

// Qué se muestra primero en el detalle: una foto (se amplía en el visor), si no un video propio, si no la
// publicación de Instagram incrustada y, si no hay nada, la imagen de reemplazo.
export function medioPrincipal(evento = {}) {
  const galeria = galeriaDeEvento(evento);
  const foto = galeria.findIndex((item) => item.tipo === "foto");
  if (foto >= 0) return { tipo: "foto", indice: foto };
  if (galeria.length > 0) return { tipo: "video", indice: 0 };
  const enlace = enlaceDeInstagram(evento);
  if (enlace) return { tipo: "instagram", url: enlace };
  return { tipo: "reemplazo" };
}

const plural = (n, singular, varios) => `${n} ${n === 1 ? singular : varios}`;

// Etiqueta de la tarjeta y del detalle con lo que el evento tiene de verdad, el texto de la acción y el tipo
// (para el ícono). Sin fotos, videos ni publicación no hay etiqueta (nunca «1 foto» por la imagen de reemplazo).
export function contenidoDeEvento(evento = {}) {
  const galeria = galeriaDeEvento(evento);
  const fotos = galeria.filter((item) => item.tipo === "foto").length;
  const videos = galeria.length - fotos;
  if (fotos > 0) {
    const etiqueta = videos > 0 ? `${plural(fotos, "foto", "fotos")} y ${plural(videos, "video", "videos")}` : plural(fotos, "foto", "fotos");
    return { tipo: "fotos", etiqueta, accion: "Ver fotos" };
  }
  if (videos > 0) {
    return { tipo: "video", etiqueta: videos === 1 ? "Video" : plural(videos, "video", "videos"), accion: "Ver video" };
  }
  if (enlaceDeInstagram(evento)) return { tipo: "instagram", etiqueta: "Publicación de Instagram", accion: "Ver evento" };
  return { tipo: null, etiqueta: null, accion: "Ver evento" };
}

// Fecha del evento como objeto Date, o null si falta o no es válida (eventos viejos).
const fechaValida = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

// «octubre de 2026» (tarjetas) o «5 de octubre de 2026» (detalle), en hora de Argentina; "" sin fecha válida.
export function textoDeFecha(valor, { conDia = false } = {}) {
  const fecha = fechaValida(valor);
  if (!fecha) return "";
  return fecha.toLocaleDateString("es-AR", {
    ...(conDia ? { day: "numeric" } : {}),
    month: "long",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  });
}

// Corta un texto largo en la última palabra completa y agrega «…».
export function recortar(texto = "", maximo = 110) {
  const limpio = String(texto || "").trim();
  if (limpio.length <= maximo) return limpio;
  return `${limpio.slice(0, maximo).replace(/\s+\S*$/, "").replace(/[\s,;.:…]+$/, "")}…`;
}

// Todo lo que muestra una tarjeta (Inicio y Eventos), calculado en un solo lugar.
export function datosDeTarjeta(evento = {}) {
  const galeria = galeriaDeEvento(evento);
  const primeraFoto = galeria.find((item) => item.tipo === "foto");
  const primerVideo = galeria.find((item) => item.tipo === "video");
  const imagen =
    primeraFoto?.url || primerVideo?.miniatura || miniaturaUtil(evento.videoThumbnail) || IMAGEN_DE_REEMPLAZO;
  return {
    titulo: String(evento.titulo || "").trim() || "Evento institucional",
    resumen: recortar(evento.resumen),
    fecha: textoDeFecha(evento.fechaEvento),
    imagen,
    ...contenidoDeEvento(evento),
  };
}

// Agrupa los eventos por año (en hora de Argentina), del más reciente al más antiguo; dentro de cada año,
// también del más reciente al más antiguo. Los que no tienen una fecha válida van al final, en «Sin fecha»,
// para que no desaparezcan. Es solo una forma de mostrarlos: no tiene que ver con el archivado (#35).
export function eventosPorAnio(eventos = []) {
  const grupos = new Map();
  const sinFecha = [];
  for (const evento of eventos) {
    const fecha = fechaValida(evento.fechaEvento);
    if (!fecha) {
      sinFecha.push(evento);
      continue;
    }
    const anio = Number(diaEnArgentina(fecha).slice(0, 4));
    if (!grupos.has(anio)) grupos.set(anio, []);
    grupos.get(anio).push(evento);
  }
  const resultado = [...grupos.entries()]
    .sort(([a], [b]) => b - a)
    .map(([anio, lista]) => ({
      clave: String(anio),
      titulo: String(anio),
      eventos: lista.sort((a, b) => new Date(b.fechaEvento) - new Date(a.fechaEvento)),
    }));
  if (sinFecha.length > 0) resultado.push({ clave: "sin-fecha", titulo: "Sin fecha", eventos: sinFecha });
  return resultado;
}

// Hashtags del texto original de una publicación sincronizada, sin repetir. Lista vacía si no tiene.
export function hashtagsDeEvento(evento = {}) {
  const encontrados = String(evento.captionOriginal || "").match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(encontrados)];
}

// Párrafos de la descripción (una línea en blanco o un salto separan párrafos).
export const parrafosDe = (texto = "") =>
  String(texto || "")
    .split(/\r?\n/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean);

// ---- Archivo de eventos en el panel (#35) ----
// El servidor manda "archivado" (calculado por fecha: de hace dos años o más). Cada evento cae en una sola
// pestaña del panel:
// - «En el sitio»: visible y vigente, o archivado que la administración eligió mostrar (visibleSiempre).
// - «Ocultos»: ocultados a mano y todavía vigentes.
// - «Archivo»: archivados por fecha (también los ocultos) y los que tenían el estado «archivado» de antes.
export function seccionDelEvento(ev) {
  if (ev.estado === "archivado") return "archivo";
  if (ev.archivado && !(ev.estado === "visible" && ev.visibleSiempre)) return "archivo";
  return ev.estado === "oculto" ? "oculto" : "sitio";
}

// Se ve en el sitio por decisión de la administración, aunque por su fecha estaría archivado.
export const visibleFueraDeFecha = (ev) => seccionDelEvento(ev) === "sitio" && Boolean(ev.archivado);

// Año del evento en Argentina, para agrupar el archivo.
export const anioDelEvento = (ev) => diaEnArgentina(ev.fechaEvento || new Date()).slice(0, 4);

export function confirmacionMostrarArchivado(ev) {
  const anio = anioDelEvento(ev);
  const oculto = ev.estado === "oculto";
  return {
    titulo: "¿Mostrar este evento en el sitio?",
    texto:
      `«${ev.titulo}» es de ${anio} y está en el archivo` +
      (oculto ? ", y además estaba oculto" : "") +
      ". Va a volver a verse en el sitio, fuera de su fecha, hasta que se lo vuelva a archivar.",
    accion: "Mostrar en el sitio",
  };
}

export const confirmacionVolverAlArchivo = (ev) => ({
  titulo: "¿Volver a archivar este evento?",
  texto: `«${ev.titulo}» deja de verse en el sitio y vuelve al archivo. No se borra nada.`,
  accion: "Volver al archivo",
});
