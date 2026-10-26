import { esEnlaceValido, esFotoNueva } from "./fotosEventos.js";

// Fotos de la galería de un evento: qué se puede editar desde el panel y cómo queda el evento después.
// Los videos no se editan acá: se conservan tal como están.

// Máximo de fotos por evento (Etapa 2). Los videos no cuentan.
export const MAXIMO_DE_FOTOS = 20;
export const IMAGEN_DE_REEMPLAZO = "/media/instagram/placeholder.svg";

// Las fotos propias de los eventos están en esta carpeta de Cloudinary (ver fotosEventos.js).
const CARPETA_PROPIA = "ifts2/eventos/";

const esImagenDeReemplazo = (url) => typeof url === "string" && url.includes("placeholder");

// Un medio es video si lo dice su tipo o si su enlace es de un video (.mp4, /video/upload/ de Cloudinary).
// Caso provisorio de Instagram: la sincronización guarda el tipo como "mediaType", que MongoDB descarta
// (el medio queda con tipo "IMAGE", el valor por defecto). En esos eventos, un video se reconoce porque
// tiene una miniatura distinta de su enlace (en las fotos es el mismo). Esa regla vale solo para eventos
// de Instagram: una foto propia puede tener otra miniatura. Cuando la sincronización guarde "tipo" (#63),
// esta regla se saca.
export function esVideo(medio, evento = {}) {
  if (medio.tipo === "VIDEO" || medio.mediaType === "VIDEO") return true;
  const url = String(medio.url || "");
  if (/\.(mp4|mov|webm)(\?|$)/i.test(url) || url.includes("/video/upload/")) return true;
  return evento.origen === "instagram" && Boolean(medio.thumbnailUrl) && medio.thumbnailUrl !== medio.url;
}

// Foto que se puede editar desde el panel: tiene enlace, no es video ni la imagen de reemplazo.
export const esFotoDeGaleria = (medio, evento) =>
  Boolean(medio?.url) && !esVideo(medio, evento) && !esImagenDeReemplazo(medio.url);

// Portada que no está en la lista de medios. Pasa en los eventos de Instagram de una sola foto (la foto
// queda solo como portada) y en eventos viejos. Si es una foto real, se edita como las demás para que
// no se pierda al cambiar la galería. No cuenta la imagen de un video ni la de reemplazo.
export function portadaSuelta(evento) {
  const url = evento.fotoPrincipal;
  if (evento.tipoMedio === "VIDEO" || !url || esImagenDeReemplazo(url) || url === evento.videoThumbnail) return null;
  if (!esEnlaceValido(url) && !esFotoNueva(url)) return null;
  const estaEnMedios = (evento.medios || []).some((medio) => medio.url === url || medio.thumbnailUrl === url);
  return estaEnMedios ? null : { tipo: "IMAGE", url };
}

// Fotos editables del evento, en orden: la portada suelta (si hay) y después las de la galería.
export function fotosDelEvento(evento) {
  const suelta = portadaSuelta(evento);
  const fotos = (evento.medios || []).filter((medio) => esFotoDeGaleria(medio, evento));
  return suelta ? [suelta, ...fotos] : fotos;
}

export const contarFotos = (medios = []) => medios.filter((medio) => esFotoDeGaleria(medio)).length;

// Revisa la lista de fotos que manda el panel: los enlaces de las fotos que se conservan y las fotos
// nuevas ("data:image/..."), en el orden final. Devuelve { error } o { pedidas, nuevas }.
// Cada foto conservada tiene que ser del evento: sus datos (publicId) salen del evento guardado.
export function revisarListaDeFotos(evento, lista) {
  if (!Array.isArray(lista) || lista.some((url) => typeof url !== "string")) {
    return { error: "La lista de fotos no es válida." };
  }

  const delEvento = new Map(fotosDelEvento(evento).map((foto) => [foto.url, foto]));
  const pedidas = [];
  const vistas = new Set();
  for (const url of lista) {
    if (vistas.has(url)) continue; // una foto repetida se guarda una sola vez
    vistas.add(url);
    // Primero se busca entre las fotos del evento: una foto vieja guardada en base64 se conserva tal cual.
    if (delEvento.has(url)) {
      pedidas.push({ nueva: false, medio: delEvento.get(url) });
    } else if (esFotoNueva(url)) {
      pedidas.push({ nueva: true, url });
    } else {
      return { error: "Una de las fotos no pertenece a este evento." };
    }
  }

  if (pedidas.length > MAXIMO_DE_FOTOS) {
    return { error: `Un evento puede tener hasta ${MAXIMO_DE_FOTOS} fotos.` };
  }
  return { pedidas, nuevas: pedidas.filter((p) => p.nueva).map((p) => p.url) };
}

// Arma los datos de la galería después de editarla. "fotos" son las fotos finales, en orden, ya con
// su enlace de Cloudinary. Devuelve los campos que cambian en el evento.
export function armarGaleria(evento, fotos, ahora = new Date()) {
  const anteriores = fotosDelEvento(evento);
  const quedan = new Set(fotos.map((foto) => foto.url));
  const quitadas = anteriores.filter((foto) => !quedan.has(foto.url));

  // Los videos y demás medios que no son fotos quedan como estaban, después de las fotos.
  const otros = (evento.medios || []).filter(
    (medio) => !esFotoDeGaleria(medio, evento) && !esImagenDeReemplazo(medio.url),
  );
  const medios = [...fotos, ...otros];

  return {
    medios,
    cantidadMedios: medios.length || 1,
    tipoMedio: tipoDeEvento(evento, medios),
    fotoPrincipal: elegirPortada(evento, fotos, quitadas, otros),
    mediosQuitados: agregarQuitadas(evento.mediosQuitados || [], quitadas, ahora),
  };
}

// Un evento de video sigue siendo de video. Si no, el tipo sale de lo que queda: varios medios son un
// carrusel; uno solo es foto o video según lo que sea; sin medios, una foto (la imagen de reemplazo).
function tipoDeEvento(evento, medios) {
  if (evento.tipoMedio === "VIDEO") return "VIDEO";
  if (medios.length > 1) return "CAROUSEL_ALBUM";
  if (medios.length === 1 && esVideo(medios[0], evento)) return "VIDEO";
  return "IMAGE";
}

// La portada es la primera foto. En un evento de video, la portada es la imagen del video y no cambia.
// Sin fotos (o si la portada era una foto que se quitó), se usa la imagen de un video o la de reemplazo.
function elegirPortada(evento, fotos, quitadas, otros) {
  const actual = evento.fotoPrincipal;
  const seQuito = quitadas.some((foto) => foto.url === actual);
  const sigueValida = actual && !seQuito && !esImagenDeReemplazo(actual) && esEnlaceValido(actual);

  const imagenDeVideo = evento.videoThumbnail || otros.find((medio) => medio.thumbnailUrl)?.thumbnailUrl;

  if (evento.tipoMedio === "VIDEO") {
    if (sigueValida) return actual;
    return imagenDeVideo || fotos[0]?.url || IMAGEN_DE_REEMPLAZO;
  }
  if (fotos.length > 0) return fotos[0].url;
  return imagenDeVideo || IMAGEN_DE_REEMPLAZO;
}

// Registro de las fotos quitadas, para no perderles el rastro (no se borran de Cloudinary).
// "propia" es solo informativo: indica si estaba en la carpeta de eventos de Cloudinary. No alcanza
// por sí solo para autorizar un borrado futuro.
function agregarQuitadas(registradas, quitadas, ahora) {
  const clave = (foto) => foto.publicId || foto.url;
  const yaEstan = new Set(registradas.map(clave));
  // Las fotos viejas guardadas en base64 no se registran: no están en Cloudinary y ocuparían mucho lugar.
  const nuevas = quitadas
    .filter((foto) => !esFotoNueva(foto.url) && !yaEstan.has(clave(foto)))
    .map((foto) => ({
      url: foto.url,
      ...(foto.publicId ? { publicId: foto.publicId } : {}),
      propia: Boolean(foto.publicId?.startsWith(CARPETA_PROPIA)),
      fechaQuitada: ahora,
    }));
  return [...registradas, ...nuevas];
}
