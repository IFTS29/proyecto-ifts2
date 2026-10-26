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
const esVideo = (medio, evento) => {
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
