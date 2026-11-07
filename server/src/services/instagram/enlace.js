// Enlace a una publicación de Instagram cargado a mano en el alta de un evento.
// Es la misma regla que usa el sitio (direccionDeInstagram de client/src/eventos.js); una prueba comprueba
// que las dos den el mismo resultado.

export const MENSAJE_ENLACE_INVALIDO =
  "El enlace de Instagram no es válido. Debe ser una publicación o un reel, por ejemplo: https://www.instagram.com/p/…";

// Dirección de una publicación de Instagram, o null si no lo es. Solo acepta https en instagram.com
// (con o sin www) y una publicación, reel o video (/p/, /reel/, /tv/). Se revisa con URL y no buscando
// el texto «instagram.com». Devuelve la dirección sin parámetros, que es la única que se descarga y se guarda.
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
