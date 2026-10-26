import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

// Fotos que se suben desde el panel al crear un evento. Llegan del navegador ya achicadas, como texto
// "data:image/...;base64,...", se guardan en Cloudinary y en MongoDB queda solo el enlace.
// Los enlaces que ya existen (Cloudinary, Instagram, /media/...) no pasan por acá: se guardan tal cual.

export const TIPOS_DE_FOTO = ["image/jpeg", "image/png", "image/webp"];
// Límite por foto, ya decodificada. En Vercel el pedido completo no puede superar 4,5 MB.
export const PESO_MAXIMO_FOTO = 4 * 1024 * 1024;
const CARPETA_CLOUDINARY = "ifts2/eventos";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// La misma carpeta que muestra la ruta /media/instagram de app.js (solo en desarrollo local).
const CARPETA_EN_DISCO = path.resolve(__dirname, "../../../storage/instagram/media");

export const esFotoNueva = (url) => typeof url === "string" && url.startsWith("data:");

// Enlace a una foto que ya existe: una dirección http(s) o una ruta del propio sitio (/media/...).
// Rechaza cualquier otra cosa (por ejemplo "javascript:..."), que no debe llegar a una etiqueta <img>.
export const esEnlaceValido = (url) =>
  typeof url === "string" && (/^https?:\/\/\S+$/i.test(url) || /^\/(?!\/)\S*$/.test(url));

// Revisa una foto nueva antes de subirla. Devuelve null si está bien o el mensaje de error para el panel.
export function revisarFotoNueva(dataUrl, numero) {
  const partes = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!partes || !TIPOS_DE_FOTO.includes(partes[1])) {
    return `La foto ${numero} no es una imagen JPG, PNG o WebP.`;
  }
  const peso = Buffer.byteLength(partes[2], "base64");
  if (peso === 0) return `La foto ${numero} está vacía.`;
  if (peso > PESO_MAXIMO_FOTO) return `La foto ${numero} pesa demasiado. Probá cargarla de nuevo desde el formulario.`;
  return null;
}

// Nombre único para cada foto: fecha, título simplificado, letras al azar y número de foto.
// Así no se pisa ninguna foto existente y en Cloudinary se reconoce a qué evento pertenece.
export function nombreDeFoto(titulo, numero, fecha = new Date()) {
  const dia = fecha.toISOString().slice(0, 10).replaceAll("-", "");
  const texto = String(titulo)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const azar = crypto.randomBytes(3).toString("hex");
  return [dia, texto || "evento", azar, numero].join("-");
}

function crearFotosCloudinary({ nombreCuenta, clave, secreto }) {
  cloudinary.config({ cloud_name: nombreCuenta, api_key: clave, api_secret: secreto, secure: true });
  return {
    async subir(dataUrl, { nombre }) {
      // Se sube la foto tal como llega. La compresión y el formato (q_auto, f_auto) se aplican
      // al mostrarla, en el enlace de entrega, no al guardarla.
      const resultado = await cloudinary.uploader.upload(dataUrl, {
        folder: CARPETA_CLOUDINARY,
        public_id: nombre,
        resource_type: "image",
        overwrite: false,
      });
      return { url: resultado.secure_url, publicId: resultado.public_id };
    },
    async borrar(publicId) {
      const resultado = await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
      if (resultado.result !== "ok" && resultado.result !== "not found") {
        throw new Error(`Cloudinary respondió "${resultado.result}"`);
      }
    },
  };
}

// Solo para desarrollo local sin Cloudinary: las fotos quedan en server/storage y las muestra app.js.
function crearFotosEnDisco(carpeta = CARPETA_EN_DISCO) {
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  return {
    async subir(dataUrl, { nombre }) {
      const [, tipo, datos] = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
      const archivo = `${nombre}.${extension[tipo]}`;
      await fs.mkdir(carpeta, { recursive: true });
      await fs.writeFile(path.join(carpeta, archivo), Buffer.from(datos, "base64"));
      return { url: `/media/instagram/${archivo}`, publicId: archivo };
    },
    async borrar(publicId) {
      await fs.rm(path.join(carpeta, path.basename(publicId)), { force: true });
    },
  };
}

// Elige dónde se guardan las fotos de los eventos:
// - con las variables de Cloudinary cargadas, en Cloudinary;
// - sin Cloudinary, en el disco, pero solo en desarrollo local (config.fotosEnDisco);
// - si no, null: la ruta responde 503 en lugar de guardar las fotos en un disco que Vercel borra.
export function crearServicioFotos(config) {
  if (config.cloudinaryNombre && config.cloudinaryClave && config.cloudinarySecreto) {
    return crearFotosCloudinary({
      nombreCuenta: config.cloudinaryNombre,
      clave: config.cloudinaryClave,
      secreto: config.cloudinarySecreto,
    });
  }
  if (config.fotosEnDisco) return crearFotosEnDisco();
  return null;
}

// Error al subir una foto: la ruta lo responde con su estado y su mensaje.
export class ErrorDeFotos extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

// Intenta borrar las fotos que se subieron en una operación que no terminó.
// Si alguna no se puede borrar, queda registrado para limpiarla a mano: no tapa el error original.
export async function borrarFotosSubidas(fotos, subidas) {
  for (const { publicId } of subidas) {
    try {
      await fotos.borrar(publicId);
    } catch (err) {
      console.error(`[eventos] No se pudo borrar la foto ${publicId} después de un error: ${err.message}`);
    }
  }
}

// Sube las fotos nuevas de a una, en el orden en que llegaron. Devuelve las subidas como
// [{ dataUrl, url, publicId }]. Si una falla, borra las anteriores y lanza ErrorDeFotos.
export async function subirFotosNuevas(fotos, dataUrls, titulo) {
  const subidas = [];
  for (const [indice, dataUrl] of dataUrls.entries()) {
    try {
      const { url, publicId } = await fotos.subir(dataUrl, { nombre: nombreDeFoto(titulo, indice + 1) });
      subidas.push({ dataUrl, url, publicId });
    } catch (err) {
      console.error(`[eventos] Falló la subida de la foto ${indice + 1}: ${err.message}`);
      await borrarFotosSubidas(fotos, subidas);
      throw new ErrorDeFotos(`No se pudo subir la foto ${indice + 1}. Probá de nuevo en unos minutos.`, 502);
    }
  }
  return subidas;
}
