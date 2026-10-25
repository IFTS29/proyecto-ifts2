import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_MEDIA_DIR = path.resolve(__dirname, "../../storage/instagram/media");

export async function asegurarDirectorioMedia() {
  await fs.mkdir(STORAGE_MEDIA_DIR, { recursive: true });
}

/**
 * Adaptador de almacenamiento local para medios de Instagram.
 * Descarga o persiste imágenes/videos en server/storage/instagram/media/
 * y devuelve la URL pública correspondiente: /media/instagram/<filename>
 *
 * @param {string|{url?: string, buffer?: Buffer, filename: string}} params
 * @param {string} [nombreArchivoOpcional]
 * @returns {Promise<string|null>} URL pública /media/instagram/... o null si falla
 */
export async function guardarMedio(params, nombreArchivoOpcional) {
  let mediaUrl = null;
  let filename = null;
  let buffer = null;

  if (typeof params === "string") {
    mediaUrl = params;
    filename = nombreArchivoOpcional;
  } else if (params && typeof params === "object") {
    mediaUrl = params.url || null;
    filename = params.filename || nombreArchivoOpcional;
    buffer = params.buffer || null;
  }

  if (!filename) return null;

  await asegurarDirectorioMedia();
  const filePath = path.join(STORAGE_MEDIA_DIR, filename);

  try {
    // Si ya existe en disco, devolvemos la ruta pública directamente
    try {
      await fs.access(filePath);
      return `/media/instagram/${filename}`;
    } catch {
      // El archivo no existe, continuamos para guardarlo
    }

    if (buffer) {
      await fs.writeFile(filePath, buffer);
      return `/media/instagram/${filename}`;
    }

    if (mediaUrl) {
      const res = await fetch(mediaUrl, {
        headers: { "User-Agent": "IFTS2-Instagram-Client/1.0" },
      });

      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));
      return `/media/instagram/${filename}`;
    }

    return null;
  } catch (err) {
    console.warn(`[media.local] Advertencia: no se pudo guardar ${filename}: ${err.message}`);
    return null;
  }
}

export const mediaAdapter = {
  guardarMedio,
};
