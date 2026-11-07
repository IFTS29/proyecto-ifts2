import { PESO_MAXIMO_FOTO } from "../media/fotosEventos.js";

// Foto de vista previa de una publicación de Instagram, para el alta de un evento con enlace.
// Se lee la página de la publicación, se toma la foto de «og:image» y se descarga. La foto se devuelve
// como "data:image/...;base64,..." para que siga el mismo camino que una foto cargada desde la
// computadora (revisión, subida a ifts2/eventos y borrado si el evento no se guarda).
//
// Controles:
// - cada pedido, incluida cada redirección, se revisa antes de hacerlo: https y un dominio permitido;
// - las redirecciones no se siguen solas (redirect: "manual") y hay un máximo;
// - todo el proceso tiene un tiempo máximo y cada descarga, un peso máximo;
// - la foto tiene que ser JPG, PNG o WebP según sus primeros bytes, no solo según lo que informa el servidor.

export const TIEMPO_MAXIMO_MS = 8000;
export const MAXIMO_DE_REDIRECCIONES = 3;
export const PESO_MAXIMO_PAGINA = 3 * 1024 * 1024;

const ES_REDIRECCION = new Set([301, 302, 303, 307, 308]);

const esDominioDePagina = (dominio) => dominio === "instagram.com" || dominio === "www.instagram.com";
const esDominioDeFoto = (dominio) => dominio.endsWith(".cdninstagram.com") || dominio.endsWith(".fbcdn.net");

// Instagram solo incluye «og:image» en la página para los lectores de vista previa de enlaces.
const CABECERAS = {
  "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Accept-Language": "es-AR,es;q=0.9",
};

class FallaDeBusqueda extends Error {}

// Lee el cuerpo de la respuesta sin pasar de "pesoMaximo" bytes.
async function leerConLimite(respuesta, pesoMaximo) {
  const declarado = Number(respuesta.headers.get("content-length"));
  if (declarado > pesoMaximo) throw new FallaDeBusqueda(`pesa más de ${pesoMaximo} bytes`);
  if (!respuesta.body) return Buffer.alloc(0);
  const lector = respuesta.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > pesoMaximo) {
      await lector.cancel().catch(() => {});
      throw new FallaDeBusqueda(`pesa más de ${pesoMaximo} bytes`);
    }
    partes.push(value);
  }
  return Buffer.concat(partes);
}

// Pide una dirección revisando cada salto antes de hacerlo. Devuelve { respuesta, cuerpo }.
async function pedir(buscar, direccion, { esPermitido, pesoMaximo, senal }) {
  let actual = direccion;
  for (let saltos = 0; saltos <= MAXIMO_DE_REDIRECCIONES; saltos += 1) {
    const url = new URL(actual);
    if (url.protocol !== "https:" || !esPermitido(url.hostname)) {
      throw new FallaDeBusqueda(`dirección no permitida (${url.hostname})`);
    }
    const respuesta = await buscar(url.href, { headers: CABECERAS, redirect: "manual", signal: senal });
    if (ES_REDIRECCION.has(respuesta.status)) {
      const destino = respuesta.headers.get("location");
      if (!destino) throw new FallaDeBusqueda("redirección sin destino");
      actual = new URL(destino, url).href;
      continue;
    }
    if (!respuesta.ok) throw new FallaDeBusqueda(`respuesta ${respuesta.status}`);
    return { respuesta, cuerpo: await leerConLimite(respuesta, pesoMaximo) };
  }
  throw new FallaDeBusqueda("demasiadas redirecciones");
}

const decodificar = (texto) =>
  texto
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/&#x0*2f;/gi, "/")
    .replace(/&amp;|&#0*38;|&#x0*26;/gi, "&");

// Valor de «og:image» en el HTML, con los atributos en cualquier orden. Devuelve null si no está.
export function fotoDeVistaPrevia(html) {
  for (const etiqueta of String(html).match(/<meta\b[^>]*>/gi) || []) {
    const atributos = {};
    for (const [, nombre, , valor] of etiqueta.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) {
      atributos[nombre.toLowerCase()] = valor;
    }
    const clave = (atributos.property || atributos.name || "").toLowerCase();
    if (clave === "og:image" && atributos.content) return decodificar(atributos.content.trim());
  }
  return null;
}

// Tipo de imagen según sus primeros bytes, o null si no es JPG, PNG ni WebP.
export function tipoDeImagen(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (bytes.length >= 12 && bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

// Devuelve buscar(direccion): la foto como data URL, o null si no se pudo obtener (con el motivo en la consola).
// "direccion" tiene que ser la de direccionDeInstagram (services/instagram/enlace.js).
// "fetch" se reemplaza en las pruebas, para no salir a Internet.
export function crearBuscadorDeFoto({ fetch: buscar = globalThis.fetch, tiempoMaximoMs = TIEMPO_MAXIMO_MS } = {}) {
  return async function buscarFotoDeInstagram(direccion) {
    // Un solo tiempo máximo para todo el proceso (página y foto).
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(new FallaDeBusqueda("tiempo agotado")), tiempoMaximoMs);
    const senal = control.signal;
    try {
      const pagina = await pedir(buscar, direccion, {
        esPermitido: esDominioDePagina,
        pesoMaximo: PESO_MAXIMO_PAGINA,
        senal,
      });
      const enlaceDeFoto = fotoDeVistaPrevia(pagina.cuerpo.toString("utf8"));
      if (!enlaceDeFoto) throw new FallaDeBusqueda("la página no tiene foto de vista previa");

      const foto = await pedir(buscar, new URL(enlaceDeFoto, direccion).href, {
        esPermitido: esDominioDeFoto,
        pesoMaximo: PESO_MAXIMO_FOTO,
        senal,
      });
      const tipo = tipoDeImagen(foto.cuerpo);
      if (!tipo) throw new FallaDeBusqueda("el archivo no es una imagen JPG, PNG o WebP");
      return `data:${tipo};base64,${foto.cuerpo.toString("base64")}`;
    } catch (err) {
      const motivo = senal.aborted ? "tiempo agotado" : err.message;
      console.warn(`[eventos] No se pudo obtener la foto de ${direccion}: ${motivo}`);
      return null;
    } finally {
      clearTimeout(reloj);
    }
  };
}
